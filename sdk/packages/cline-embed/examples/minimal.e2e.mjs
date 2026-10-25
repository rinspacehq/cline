import { chromium } from "playwright";

const url = process.argv[2];
if (!url) throw new Error("Browser example URL is required");

const browser = await chromium.launch({ headless: true });
try {
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	const externalRequests = [];
	page.on("request", (request) => {
		const requestUrl = new URL(request.url());
		if (requestUrl.origin !== new URL(url).origin) {
			externalRequests.push(request.url());
		}
	});
	await page.goto(url, { waitUntil: "networkidle" });
	await page.locator("[data-agent-output]").waitFor();
	const output = await page.locator("[data-agent-output]").textContent();
	if (output !== "Browser runtime ready") {
		throw new Error(`Unexpected browser Agent output: ${output}`);
	}
	const status = await page.locator("html").getAttribute("data-agent-status");
	if (status !== "completed") {
		throw new Error(`Unexpected browser Agent status: ${status}`);
	}
	if (externalRequests.length > 0) {
		throw new Error(
			`Unexpected external requests: ${externalRequests.join(", ")}`,
		);
	}
} finally {
	await browser.close();
}
