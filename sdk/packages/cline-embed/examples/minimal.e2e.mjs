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
	await page.getByText("Browser runtime ready").waitFor();
	await page.getByText("Compilation completed").waitFor();
	await page.getByText("paper.tex").waitFor();
	await page.getByText("+ Browser-safe change").waitFor();
	const status = await page.locator("html").getAttribute("data-agent-status");
	if (status !== "completed") {
		throw new Error(`Unexpected browser Agent status: ${status}`);
	}
	const approval = page.getByRole("button", { name: "Approve" });
	await approval.focus();
	if (
		(await approval.evaluate(
			(element) => getComputedStyle(element).outlineStyle,
		)) === "none"
	) {
		throw new Error("Approval action has no visible focus style");
	}
	await approval.click();
	if (
		(await page.locator("html").getAttribute("data-approval")) !== "approved"
	) {
		throw new Error("Approval action did not reach the host callback");
	}
	const lightColor = await page
		.locator(".rinspace-cline-embed")
		.evaluate((element) => getComputedStyle(element).color);
	await page
		.locator("html")
		.evaluate((element) => element.classList.add("dark"));
	const darkColor = await page
		.locator(".rinspace-cline-embed")
		.evaluate((element) => getComputedStyle(element).color);
	if (lightColor === darkColor) {
		throw new Error("Host light and dark theme tokens produced the same color");
	}
	const documentWidth = await page.evaluate(
		() => document.documentElement.scrollWidth,
	);
	if (documentWidth > 390) {
		throw new Error(`Narrow layout overflowed to ${documentWidth}px`);
	}
	if (externalRequests.length > 0) {
		throw new Error(
			`Unexpected external requests: ${externalRequests.join(", ")}`,
		);
	}
} finally {
	await browser.close();
}
