# ComfyUI API with ComfyDeploy

To install dependencies:

```bash
bun install
```

## Local: 
Start up ComfyUI locally.

Make sure you have ComfyDeploy custom node installed.

What the scripts does:
```
1. Locate ComfyUI local instance
2. Queue the run with External Inputs
3. Return the output and save it to the output folder
```

## Cloud:

This works with ComfyDeploy cloud.

What the scripts does:
```
1. Retrive the˝ wrokflow from deployment
2. Create a new cloud ComfyUI session with any GPU (CPU, A10G, H100, B200, etc)
3. Queue the run with External Inputs
4. Return the output and save it to the output folder
5. Delete the cloud ComfyUI session
```

To set up environment variables:

```bash
cp .env.example .env
```

```
COMFYDEPLOY_API_KEY="" // Get this from ComfyDeploy
DEPLOYMENT_ID="" // Your target deployment ID
```


To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.10. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
