<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Work tracking

- Break every new prompt into clear tasks and smaller subtasks in `docs/tasks.md`.
- For each task, describe the active work in `docs/todo.md`.
- Commit the task's changes before testing them.
- Test the task after the commit.
- Once the task is complete, move its entry from `docs/tasks.md` to `docs/done.md`.
- Keep `docs/todo.md` limited to the task currently being worked on.

## Project-specific delivery

- Preserve the existing application stack and repository structure.
- Keep GitHub Actions, GitHub Pages reports, the web demo, and Android emulator coverage working together.
- Do not add credentials or invent external service values; document and request anything required.
