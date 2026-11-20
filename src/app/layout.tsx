import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";
import { Toaster } from "@/components/Toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "Gym Planner", template: "%s · Gym Planner" },
  description: "Rutinas, plan semanal, calendario y analítica de entrenamiento",
  appleWebApp: { capable: true, title: "Gym Planner", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1e" },
  ],
};

// Aplica tema, estado de arranque y variante aleatoria (evitando repetir la sesión previa) antes del primer pintado.
const PREPAINT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}try{if(sessionStorage.getItem("gp:booted")==="1"){document.documentElement.setAttribute("data-gp-booted","1")}else{var raw=sessionStorage.getItem("gp:boot-config"),cfg=raw?JSON.parse(raw):null;if(!cfg||typeof cfg.variant!=="number"){var lv=null,lw=null;try{var a=localStorage.getItem("gp:last-variant"),b=localStorage.getItem("gp:last-welcome");if(a!==null)lv=Number(a);if(b!==null)lw=Number(b)}catch(e){}var vs=[0,1,2].filter(function(n){return n!==lv}),ws=[0,1,2,3].filter(function(n){return n!==lw});var p=[0,1,2,3,4,5,6,7,8,9,10,11];for(var i=p.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),x=p[i];p[i]=p[j];p[j]=x}cfg={variant:vs[Math.floor(Math.random()*vs.length)],welcomeIndex:ws[Math.floor(Math.random()*ws.length)],stepIndices:[p[0],p[1],p[2]]};sessionStorage.setItem("gp:boot-config",JSON.stringify(cfg))}document.documentElement.setAttribute("data-gp-variant",String(cfg.variant))}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <ServiceWorker />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
