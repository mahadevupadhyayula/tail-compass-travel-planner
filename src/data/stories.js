// Travel stories are user-supplied or clearly labelled examples.
// Tail Compass never invents a testimonial or attributes words to a real person.
export const stories = [
  {
    id: "example-goa",
    destination: "Goa",
    kind: "EXAMPLE",
    label: "Example story",
    body: "This card shows the shape a real travel story will take once pet parents start sharing them. It is written by the Tail Compass team, not by a traveller.",
    author: "Tail Compass team"
  }
];

export const realStories = stories.filter(story => story.kind === "USER_SUPPLIED");
