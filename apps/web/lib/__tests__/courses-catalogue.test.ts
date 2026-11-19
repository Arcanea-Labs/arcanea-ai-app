import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CoursesPage from "../../app/academy/courses/page";
import { COURSES, getCourse } from "../courses";

// The catalogue page once listed five invented courses whose slugs matched
// nothing in lib/courses.ts, so every card ended in notFound(). Render the
// page and follow its own links instead of trusting a list.
const html = renderToStaticMarkup(React.createElement(CoursesPage));
const linkedSlugs = [
  ...html.matchAll(/href="\/academy\/courses\/([^"/?#]+)"/g),
].map((match) => match[1]);

test("every course card links to a course that /academy/courses/[slug] can serve", () => {
  assert.ok(linkedSlugs.length > 0, "the catalogue renders course links");
  for (const slug of linkedSlugs) {
    assert.ok(getCourse(slug), `/academy/courses/${slug} has no course data`);
  }
});

test("the catalogue lists each course in lib/courses.ts exactly once", () => {
  assert.deepEqual(
    [...linkedSlugs].sort(),
    COURSES.map((course) => course.slug).sort(),
  );
});

test("each card states the lesson count and duration held in the course data", () => {
  for (const course of COURSES) {
    const card = html
      .split('href="/academy/courses/')
      .find((chunk) => chunk.startsWith(`${course.slug}"`));
    assert.ok(card, `${course.slug} has a card`);
    assert.ok(
      card.includes(`${course.lessons.length} lessons`),
      `${course.slug} shows ${course.lessons.length} lessons`,
    );
    assert.ok(
      card.includes(course.duration),
      `${course.slug} shows ${course.duration}`,
    );
  }
});

test("course cards identify the Gate guardian instead of displaying a noncanonical element", () => {
  for (const course of COURSES) {
    const anchor = html.match(
      new RegExp(
        `<a[^>]*href="/academy/courses/${course.slug}"[^>]*>([\\s\\S]*?)</a>`,
      ),
    );
    assert.ok(anchor, course.slug);
    assert.ok(anchor[1].includes(`Guardian: ${course.guardian}`), course.slug);
    assert.ok(!anchor[1].includes(`>${course.element}<`), course.slug);
  }
});
