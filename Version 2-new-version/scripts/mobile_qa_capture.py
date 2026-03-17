from __future__ import annotations

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright


PAGES = [
    "index.html",
    "finora-philosophie.html",
    "ueber-finora.html",
    "kontakt.html",
    "altersvorsorge.html",
    "investment-beratung.html",
    "immobilien-beratung.html",
    "erbanlage-beratung.html",
    "impressum.html",
    "datenschutz.html",
]

VIEWPORTS = [
    (320, 568),
    (360, 800),
    (375, 812),
    (390, 844),
    (412, 915),
]

NO_MOTION_CSS = """
html,
body {
    scroll-behavior: auto !important;
}

*,
*::before,
*::after {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
}

.anim,
.anim::before,
.anim::after,
.anim.is-visible,
.anim--fade,
.anim--right,
.anim--left,
.anim--scale {
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    filter: none !important;
}

.timeline-card__details,
.hero-slide,
.hero-slider-track,
.testimonials-track-inner,
.testimonials-grid,
.pillar-card,
.mobile-menu,
.site-header {
    transition: none !important;
}
"""


def settle_page(page) -> None:
    page.wait_for_load_state("networkidle")
    page.add_style_tag(content=NO_MOTION_CSS)
    page.evaluate(
        """
        async () => {
            const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

            document.documentElement.setAttribute("data-qa-no-motion", "true");
            document.body.classList.add("qa-no-motion");

            document.querySelectorAll(".anim").forEach((el) => {
                el.classList.add("is-visible");
                el.style.opacity = "1";
                el.style.transform = "none";
                el.style.filter = "none";
            });

            document.querySelectorAll("video").forEach((video) => {
                try {
                    video.pause();
                } catch (error) {
                    console.debug(error);
                }
            });

            if (document.fonts?.ready) {
                await document.fonts.ready;
            }

            const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const step = Math.max(window.innerHeight * 0.75, 1);

            for (let y = 0; y <= maxScroll; y += step) {
                window.scrollTo(0, Math.min(y, maxScroll));
                await wait(120);
            }

            window.scrollTo(0, 0);
            await wait(250);
        }
        """
    )


def capture(base_url: str, output_dir: Path) -> list[dict]:
    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        for width, height in VIEWPORTS:
            viewport_dir = output_dir / f"{width}x{height}"
            viewport_dir.mkdir(parents=True, exist_ok=True)

            context = browser.new_context(
                viewport={"width": width, "height": height},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=2,
                reduced_motion="reduce",
            )

            for page_name in PAGES:
                page = context.new_page()
                console_errors: list[str] = []
                page_errors: list[str] = []
                failed_responses: list[dict] = []

                page.on(
                    "console",
                    lambda msg, bucket=console_errors: bucket.append(msg.text)
                    if msg.type == "error"
                    else None,
                )
                page.on("pageerror", lambda exc, bucket=page_errors: bucket.append(str(exc)))
                page.on(
                    "response",
                    lambda response, bucket=failed_responses: bucket.append(
                        {
                            "status": response.status,
                            "url": response.url,
                            "resource": response.request.resource_type,
                        }
                    )
                    if response.status >= 400
                    else None,
                )

                page.goto(f"{base_url.rstrip('/')}/{page_name}", wait_until="networkidle")
                settle_page(page)

                metrics = page.evaluate(
                    """
                    () => ({
                        title: document.title,
                        scrollWidth: document.documentElement.scrollWidth,
                        innerWidth: window.innerWidth,
                        bodyWidth: Math.round(document.body.getBoundingClientRect().width * 100) / 100,
                        noMotionApplied: document.documentElement.getAttribute("data-qa-no-motion") === "true",
                        visibleAnimCount: Array.from(document.querySelectorAll(".anim"))
                            .filter((el) => getComputedStyle(el).opacity !== "0")
                            .length,
                    })
                    """
                )

                screenshot_name = page_name.replace(".html", "") + ".png"
                page.screenshot(path=str(viewport_dir / screenshot_name), full_page=True)

                results.append(
                    {
                        "file": page_name,
                        "viewport": f"{width}x{height}",
                        **metrics,
                        "consoleErrors": console_errors,
                        "pageErrors": page_errors,
                        "failedResponses": failed_responses,
                    }
                )

                page.close()

            context.close()

        browser.close()

    return results


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Capture mobile QA screenshots with loading animations disabled."
    )
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:4173",
        help="Base URL for the local static site.",
    )
    parser.add_argument(
        "--output-dir",
        default="qa-screenshots/final-no-anim",
        help="Directory where screenshots and validation JSON will be written.",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    results = capture(args.base_url, output_dir)

    validation_path = output_dir / "mobile-validation.json"
    validation_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

    summary = {
        "totalRuns": len(results),
        "overflowFailures": sum(1 for item in results if item["scrollWidth"] > item["innerWidth"] + 1),
        "consoleFailures": sum(1 for item in results if item["consoleErrors"] or item["pageErrors"]),
        "networkFailures": sum(1 for item in results if item["failedResponses"]),
        "noMotionFailures": sum(1 for item in results if not item["noMotionApplied"]),
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
