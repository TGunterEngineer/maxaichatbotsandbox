import { Helmet } from "react-helmet-async";
import LegalDoc from "./LegalDoc";

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — MaximumAI Chatbot Platform</title>
        <meta
          name="description"
          content="How MaximumAI Consulting collects, processes, and protects chatbot conversation data, captured leads, and account information."
        />
        <link rel="canonical" href="https://maxaichatbotsandbox.lovable.app/privacy" />
        <meta property="og:title" content="Privacy Policy — MaximumAI Chatbot Platform" />
        <meta
          property="og:description"
          content="How MaximumAI handles chatbot conversation data, captured leads, and account information."
        />
        <meta property="og:url" content="https://maxaichatbotsandbox.lovable.app/privacy" />
      </Helmet>
      <LegalDoc defaultTab="privacy" />
    </>
  );
}
