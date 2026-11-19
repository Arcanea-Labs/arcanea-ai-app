import { COURSES } from "@/lib/courses";
import { CoursesContent, type CourseCard } from "./courses-content";

// Cards carry only what the catalogue shows, so lesson bodies stay on the server.
const CATALOGUE: CourseCard[] = COURSES.map((course) => ({
  slug: course.slug,
  title: course.title,
  subtitle: course.subtitle,
  description: course.description,
  gate: course.gate,
  gateName: course.gateName,
  guardian: course.guardian,
  difficulty: course.difficulty,
  duration: course.duration,
  color: course.color,
  lessonTitles: course.lessons.map((lesson) => lesson.title),
}));

export default function CoursesPage() {
  return <CoursesContent courses={CATALOGUE} />;
}
