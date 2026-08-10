"use client";

import { useEffect } from "react";


declare global {
  interface Window {
    AppleID: any;
  }
}


export default function AppleProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  useEffect(() => {

    const script = document.createElement("script");

    script.src =
      "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid.auth.js";

    script.async = true;


    script.onload = () => {

      window.AppleID.auth.init({

        clientId:
          process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "",

        scope:
          "name email",

        redirectURI:
          process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || "",

        usePopup: true,

      });

    };


    document.body.appendChild(script);


    return () => {
      document.body.removeChild(script);
    };


  }, []);


  return children;

}