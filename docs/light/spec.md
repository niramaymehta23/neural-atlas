# Light on the processor

Make Neural Atlas as light on the processor as possible, so it runs comfortably on a base M1 MacBook
Air (8-core CPU, 7-core GPU, 8 GB, no fan, 2560×1600 screen). Runs between stage 11 and stage 12.

## Requirements

- REQ-LIGHT-01: A repeatable script, not part of the normal test run, measures every page of the built site: CPU of the page and graphics processes, long tasks and frame gaps when just loaded, left alone 25 s, in use and hidden; memory, and the script and model data each page loads.
- REQ-LIGHT-02: A page with nothing moving uses next to no CPU; scenes that breathe may draw less often or rest sooner, but stay.
- REQ-LIGHT-03: Nothing runs in a hidden tab except what the learner asked for, such as sound; coming back resumes cleanly.
- REQ-LIGHT-04: The look and the behaviour are kept: pictures look the same, links replay exactly, seeded results do not change. A saving that needs a visible change is listed for the owner instead.
- REQ-LIGHT-05: The hand-over states a budget per page type, judged against a baseline from the same machine, and tests fail if an idle page draws again or a hidden tab keeps working.
