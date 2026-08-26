import Script from "next/script";

const DEFAULT_WEBSITE_ID = "dfid_mrtwmsuzR6tdXquAEDpsz";
const DEFAULT_DOMAIN = "ownmars.lol";

export function DataFast() {
  const websiteId = process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID || DEFAULT_WEBSITE_ID;
  const domain = process.env.NEXT_PUBLIC_DATAFAST_DOMAIN || DEFAULT_DOMAIN;
  if (!websiteId || !domain) return null;
  return (
    <Script
      src="https://datafa.st/js/script.js"
      data-website-id={websiteId}
      data-domain={domain}
      strategy="afterInteractive"
    />
  );
}
