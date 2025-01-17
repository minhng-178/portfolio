import { links } from "./data";
export type NavComponent = (typeof links)[number];
export type SectionName = (typeof links)[number]["name"];
