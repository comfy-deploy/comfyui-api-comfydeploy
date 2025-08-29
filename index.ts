const comfydeployAPIKey = process.env.COMFYDEPLOY_API_KEY

import workflow from "./workflow.json"
import workflow_api from "./workflow_api.json"

// VARIABLES
const deploymentId = process.env.DEPLOYMENT_ID as string

let comfyAPIURL = "http://127.0.0.1:8188" // Local ComfyUI

// HELPER FUNCTIONS
async function downloadFileFromComfyUI({ filename, pollInterval = 1, maxWaitSeconds = 2 }: { filename: string; pollInterval?: number; maxWaitSeconds?: number }) {
    const viewFileAPI = comfyAPIURL + "/api/view"

    const startTime = Date.now()
    while (true) {
        const response = await fetch(viewFileAPI + "?filename=" + filename)

        if (Date.now() - startTime > maxWaitSeconds * 1000) {
            throw new Error("Max wait time reached")
        }

        if (!response.ok) {
            await new Promise(resolve => setTimeout(resolve, pollInterval * 1000))
            continue
        }

        const blob = await response.blob()

        const outputFile = "output/" + filename
        await Bun.write(outputFile, blob)
        console.log("Downloaded file to " + outputFile)
        break
    }
}

async function queueComfyDeploy(payload: {
    inputs: any,
    workflow: any,
    workflow_api_raw: any,
}) {
    const comfydeployRunAPI = comfyAPIURL + "/api/comfyui-deploy/run"

    const run_id = crypto.randomUUID()

    const response = await fetch(comfydeployRunAPI, {
        method: "POST",
        body: JSON.stringify({ ...payload, run_id }),
    })
    const data = await response.json()
    console.log(data)
}

async function createComfyDeploySession({ machineId, gpu = 'CPU', timeout = 5 }: { machineId: string, gpu?: string, timeout?: number, wait_for_server?: boolean }) {
    const response = await fetch('https://api.comfydeploy.com/api/session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + comfydeployAPIKey
        },
        body: JSON.stringify({
            machine_id: machineId,
            gpu: gpu,
            timeout: timeout,
            wait_for_server: true
        })
    })
    const data = await response.json()
    return data as {
        session_id: string,
        url: string,
    }
}

async function deleteComfyDeploySession(sessionId: string) {
    const response = await fetch('https://api.comfydeploy.com/api/session/' + sessionId, {
        method: 'DELETE',
        headers: {
            Authorization: 'Bearer ' + comfydeployAPIKey
        }
    })
    const data = await response.json()
    console.log(data)
}

async function getDeployment(deploymentId: string) {
    const response = await fetch('https://api.comfydeploy.com/api/deployment/' + deploymentId, {
        headers: {
            Authorization: 'Bearer ' + comfydeployAPIKey
        }
    })
    const data = await response.json()
    return data as {
        workflow_version_id: string
        machine_id: string
    }
}

async function getWorkflowVersionId(versionId: string) {
    const response = await fetch('https://api.comfydeploy.com/api/workflow-version/' + versionId, {
        headers: {
            Authorization: 'Bearer ' + comfydeployAPIKey
        }
    })
    const data = await response.json()
    return data as {
        workflow: any,
        workflow_api: any,
    }
}
// END HELPER FUNCTIONS

let workflowVersion: {
    workflow: any,
    workflow_api: any,
} | undefined;

let session: {
    session_id: string,
    url: string,
} | undefined;

if (deploymentId) {
    const deployment = await getDeployment(deploymentId)

    console.log("Deployment ID: " + deploymentId)
    console.log("Workflow Version ID: " + deployment.workflow_version_id)

    workflowVersion = await getWorkflowVersionId(deployment.workflow_version_id)

    // Create a new session
    console.log("Creating session...")
    session = await createComfyDeploySession({
        machineId: deployment.machine_id,
    })

    console.log("Session ID: " + session.session_id)

    comfyAPIURL = session.url

    console.log("Session URL: " + comfyAPIURL)
}

const filename_prefix = crypto.randomUUID()
// Queue the workflow thru raw ComfyDeploy API

console.log("Queueing workflow...")
await queueComfyDeploy({
    inputs: {
        input_image: "https://comfy-deploy-output.s3.us-east-2.amazonaws.com/assets/img_TnmbjHniCjjETWkh.png",
        filename_prefix: filename_prefix,
    },
    workflow: workflowVersion?.workflow ?? workflow,
    workflow_api_raw: workflowVersion?.workflow_api ?? workflow_api,
})

// Download the output file and wait for it to be available max 60 seconds
await downloadFileFromComfyUI({
    filename: filename_prefix + "_00001.mp4",
    pollInterval: 1,
    maxWaitSeconds: 60,
})

if (session) {
    console.log("Deleting session...")
    await deleteComfyDeploySession(session.session_id)
}