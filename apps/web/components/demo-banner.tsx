import Link from "next/link";
import { connection } from "next/server";
import { consolePassword } from "@/server/auth";
import { isDemo } from "@/server/demo";

/** Strip shown on the public portfolio demo only (FIELDCUT_DEMO=1). */
export async function DemoBanner() {
  await connection();
  if (!isDemo()) return null;
  return (
    <div className="bg-loam px-5 py-2 text-center text-xs text-oat">
      <b className="text-dawn">Portfolio demo</b> · orders here are not real and reset when the demo sleeps ·{" "}
      <Link href="/console" className="font-semibold underline underline-offset-2">
        Open the kitchen console
      </Link>{" "}
      (password <span className="font-mono font-semibold">{consolePassword()}</span>)
    </div>
  );
}
