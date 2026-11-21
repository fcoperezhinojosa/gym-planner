import { handleSchedule } from "@vercel/schedules";
import { runDailyReminders } from "@/lib/push";

export const POST = handleSchedule(async (metadata) => {
  const result = await runDailyReminders(new Date());
  console.log(
    `[schedule:${metadata.name}] exec=${metadata.executionId} checked=${result.checked} notified=${result.notified} skipped=${result.skipped} failed=${result.failed}`,
  );
});
