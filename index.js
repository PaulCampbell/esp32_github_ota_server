import { Hono } from "hono";
import { Octokit } from "octokit";
import { serve } from '@hono/node-server'
import Debug from 'debug'
const debug = Debug('ota-server');

const GITHUB_TOKEN = "your-token";
const ESP32_FIRMWARE_OWNER = "your-github-username";
const ESP32_FIRMWARE_REPO = "your-firmware-repo";


const PORT = 3000;
const HOST = "192.168.1.236";

const BASE_URL = `http://${HOST}:${PORT}`;
console.log(`Starting OTA server on ${BASE_URL}`);



const octokit = new Octokit({ auth: GITHUB_TOKEN });
const app = new Hono();
app.get("/", (c) => {
	debug("GET /");
	return c.html(`
        <html>
            <body>
                <h1>OTA updates, wooo yeah!</h1>
            </body>
        </html>
    `);
});

app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

const api = new Hono();

api.get("/firmware/latest", async (c) => {
	debug("GET /firmware/latest");
	// call github releases api to get latest release
	const latestReleaseResponse = await octokit.request(
		"GET /repos/{owner}/{repo}/releases/latest",
		{
			owner: ESP32_FIRMWARE_OWNER,
			repo: ESP32_FIRMWARE_REPO,
			headers: {
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);
	const latestRelease = latestReleaseResponse.data;
	const { tag_name, tarball_url } = latestRelease;
	debug(`Latest firmware version: ${tag_name}`);
	// build the url to download the latest firmware version
	const latestVersionUrl = `${BASE_URL}/firmware/${tag_name}`;
	console.log(`Latest firmware download url: ${latestVersionUrl}`);
	return c.json({
		version: tag_name,
		url: latestVersionUrl,
	});
});

api.get("/firmware/:version", async (c) => {
	const version = c.req.param("version");
	debug(`GET /firmware/:version - ${version}`);
	// call github releases api to get specific release by version
	const releaseResponse = await octokit.request(
		"GET /repos/{owner}/{repo}/releases/tags/{tag}",
		{
			owner: ESP32_FIRMWARE_OWNER,
			repo: ESP32_FIRMWARE_REPO,
			tag: version,
			headers: {
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);
	const release = releaseResponse.data;
	const { tarball_url } = release;
	// fetch the tarball from github and return it as a stream
	const response = await fetch(tarball_url, {
		headers: {
			Authorization: `token ${GITHUB_TOKEN}`,
		},
	});
	return c.body(response.body, 200, {
		"Content-Type": "application/x-gzip",
		"Content-Disposition": `attachment; filename=${version}.tar.gz`,
	});
});

app.route("/", api);

app.onError((err, c) => {
	debug("Error:", err);
	return c.json({ message: "Internal Server Error", ok: false }, 500);
});

const server = serve(app);

process.on('SIGINT', () => {
  server.close()
  process.exit(0)
})
process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})