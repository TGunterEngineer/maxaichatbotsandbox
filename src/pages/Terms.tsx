import { Helmet } from "react-helmet-async";
import LegalDoc from "./LegalDoc";

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — MaximumAI Chatbot Platform</title>
        <meta
          name="description"
          content="Subscription, acceptable-use, and liability terms for organizations using the MaximumAI AI chatbot platform and lead-capture services."
        />
        <link rel="canonical" href="https://maxaichatbotsandbox.lovable.app/terms" />
        <meta property="og:title" content="Terms of Service — MaximumAI Chatbot Platform" />
        <meta
          property="og:description"
          content="Subscription, acceptable-use, and liability terms for the MaximumAI AI chatbot platform."
        />
        <meta property="og:url" content="https://maxaichatbotsandbox.lovable.app/terms" />
      </Helmet>
      <LegalDoc defaultTab="terms" />
    </>
  );
}
