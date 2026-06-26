# ESP32 Github OTA updates - Server

Here is the webserver code for the [Designing an OTA update system for the esp32](https://agoodmooring.com/articles/esp32-github-ota-releases) blog post.

There is a matching firmware repository [here](https://github.com/PaulCampbell/esp32_github_ota_firmware)

## Endpoints

The server will have a couple of endpoints:

### GET /firmware/latest

The ESP32 will call this endpoint when it wants to check to see if there is an update for it.

The server will make a call to the Github ReST API to ask for the latest release version of the firmware. It's gonna respond to the ESP32 with the current latest version, and a URL the ESP32 can call to download that version:

Example response:

```
200 OK
Content-type: application/json
{
	"version": "v1.0.1",
	"url": "https://mywebserver.com/firmware/v1.0.1"
}
```

### GET /firmware/[versionNumber]

The ESP32 will call this endpoint when it wants to download a version of the firmware to install it.

The server will make a call to Github to get the tarball associated with the release it was asked for, and send the response back down to the ESP32

Example response:

```
200 OK
Content-type: application/x-gzip
[[tarball]]
```

## Running locally

Set the [github variables](https://github.com/PaulCampbell/esp32_github_ota_server/blob/main/index.js#L7-L9) to point at your esp32 firmware repository.

```
const GITHUB_TOKEN = "your-github-token";
const ESP32_FIRMWARE_OWNER = "your-github-username";
const ESP32_FIRMWARE_REPO = "your-firmware-repo";
```

You'll need to create a github [personal access token](https://github.com/settings/personal-access-tokens/new) with `Contents` permission on your [firmware](https://github.com/PaulCampbell/esp32_github_ota_firmware) repository.

restore the dependencies and run up the server:

```
npm install
DEBUG=ota-server npm run start
```