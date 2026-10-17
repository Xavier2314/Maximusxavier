"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markLessonAction(lessonId: string, complete: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (complete) await supabase.from("course_progress").upsert({ user_id: user.id, lesson_id: lessonId });
  else await supabase.from("course_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
  revalidatePath("/academy", "layout");
  revalidatePath("/dashboard");
}
