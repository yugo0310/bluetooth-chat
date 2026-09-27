# Bluetooth Chat

This is a simple local chat room application that runs entirely on one PC in the browser without any external server.

## Features
- Create a new room
- Generate a room ID automatically
- Join a room by ID
- Send text messages in real time
- Delete the room when finished
- Works on one PC with no backend

## Run locally

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Open the app in multiple tabs or windows on the same computer to simulate chat participants.

## Note about Bluetooth

Modern browsers have strict restrictions on Bluetooth access. In practice, browser-only Bluetooth chat between PCs is not reliable or portable. This project follows the same room-based workflow in a local and practical way so it can run locally without installation.

## License

MIT
