import type { Metadata } from "next";
import { lessonById, lessons } from "@/catalog";
import { platformCaptions } from "@/platform/captions";
import type { Lesson } from "@/platform/contract";
import { LockedLesson } from "@/platform/LockedLesson";
import { LessonPage } from "./LessonPage";

type Props = { params: Promise<{ moduleId: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map(({ id }) => ({ moduleId: id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = lessonById((await params).moduleId);
  if (!lesson) return {};
  return { title: platformCaptions.site.pageTitle(lesson.title), description: lesson.idea };
}

export default async function LearnPage({ params }: Props) {
  const lesson = lessonById((await params).moduleId);
  if (!lesson) return null;
  if (lesson.load) return <LessonPage id={lesson.id} />;
  const plain = ({ id, title, prerequisites }: Lesson) => ({ id, title, prerequisites });
  const prerequisites = lesson.prerequisites.flatMap((id) => lessonById(id) ?? []).map(plain);
  const built = lessons.filter(({ load }) => load).map(plain);
  const { title, idea, playWith } = lesson;
  return (
    <LockedLesson lesson={{ title, idea, playWith }} prerequisites={prerequisites} built={built} />
  );
}
