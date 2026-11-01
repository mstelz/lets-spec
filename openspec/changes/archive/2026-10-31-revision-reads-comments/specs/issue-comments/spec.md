## ADDED Requirements

### Requirement: Revision mode reads the thread of each open story the map links
In Revision mode step 1, after the stale-link check and before it re-annotates the stages, `lets-shape` SHALL read the thread of each open issue the map links. It SHALL take the issues from the map's `issues/<n>` links, keep the ones the issue list reports as open, and handle them one at a time in ascending number. For each issue it SHALL fetch the thread as the reference says and show the reference's list. It SHALL ask about each comment not labelled `read`. It SHALL write the fold and the map change the answers call for. When it asked at least one question on the issue, it SHALL fetch again until nothing is new, and then reply. It SHALL not read closed issues, or open issues the map does not link.

#### Scenario: Two open stories and a closed one
- **WHEN** the map links #87 and #102, which are open, and #26, which is closed
- **THEN** shaping shows the thread of #87, then of #102, and does not fetch the thread of #26

#### Scenario: A story with no comments
- **WHEN** an open linked story has no comments
- **THEN** shaping asks nothing about it, posts no reply on it, and moves to the next issue

#### Scenario: The skill says it
- **WHEN** the skill-interfaces test reads `skills/lets-shape/SKILL.md`
- **THEN** it finds the sentence `Read the thread of each open issue the map links`

## MODIFIED Requirements

### Requirement: Shaping asks about each unread comment
This applies when `lets-shape` shapes an existing issue in Shape one issue, ingests an issue, or reads an open linked story in Revision mode. It SHALL ask the user about each comment the newest read marker does not cover, in list order, one at a time. In Shape one issue and Revision mode the recommended answer SHALL be fold or dismiss, with the reason. In Revision mode, when a comment changes a journey stage and not the packet, the recommended answer SHALL be to update the map, naming the stage. In Ingest it SHALL be take into the parent issue or dismiss, with the reason. In Shape one issue the questions SHALL run for every Kind, as their own step after the code is read and before the template interview. When the packet already holds a comment's content, or the comment changes neither the packet nor a stage, shaping SHALL recommend dismiss, with that reason. An existing issue found by title search and confirmed by the user SHALL be read, body and thread, like a named one.

#### Scenario: A comment already in the packet
- **WHEN** a comment asks for a path change that the body's **Relevant code** line already shows
- **THEN** the agent recommends dismiss, saying the packet already holds it

#### Scenario: A Chore with a comment
- **WHEN** the issue's Kind is Chore and it holds one unread comment
- **THEN** shaping asks about that comment before it writes the issue

#### Scenario: An issue found by search
- **WHEN** the user describes work, step 1 finds an open issue by title, and the user confirms it is the same work
- **THEN** shaping reads that issue's body and thread, and asks about its unread comments

#### Scenario: An issue with no comments
- **WHEN** the issue has no comments
- **THEN** shaping asks nothing about comments and posts no reply

#### Scenario: A superseded story in Revision mode
- **WHEN** a `candidate` comment on an open linked story says #140 supersedes it, and no read marker covers the comment
- **THEN** shaping asks about it, recommends updating the map to link #140 at that stage, and does not offer to close the story

#### Scenario: A comment about something else in Revision mode
- **WHEN** an unread `outside` comment on an open linked story asks a question the packet and the map do not touch
- **THEN** shaping asks about it and recommends dismiss, saying it changes neither

### Requirement: A fold rewrites the packet line
In Shape one issue and Revision mode, a yes SHALL fold the comment by rewriting the packet lines it affects to say what is now true, without pasting the comment's text. In Shape one issue the folds SHALL ride the body write at the pass's existing confirm step, so the user sees the folded body whole before shaping writes it. In Revision mode, shaping SHALL show the folded body, get a yes, and write it with `gh issue edit <i> --body-file <file>`, once per issue. It SHALL write the body only, and SHALL leave the issue's title and its Kind, Priority, Size and Status as they are. In Ingest, a yes SHALL take the comment into the parent issue's Scope or Open questions, and shaping SHALL leave the input issue's body unedited.

#### Scenario: A fold in Shape one issue
- **WHEN** the user says yes to a comment that moves the story's specs to a new path
- **THEN** the confirm step shows a body whose **Relevant code** line names the new path, and shaping writes the body once

#### Scenario: A comment taken in during Ingest
- **WHEN** the user says yes to a comment on the input issue during Ingest
- **THEN** the parent issue's Scope or Open questions carries the point, and the input issue's body is unchanged

#### Scenario: A fold in Revision mode on a story in progress
- **WHEN** the user says yes to a comment that moves a linked story's paths, and that story's Status is In Progress
- **THEN** shaping shows the folded body, writes it once with `gh issue edit`, and the Status is still In Progress

#### Scenario: A yes that changes only a stage
- **WHEN** the user says yes to a comment that changes a journey stage and not the packet
- **THEN** shaping does not edit the story's body, and `discovery.md` holds the stage change before shaping posts the reply

### Requirement: Shaping fetches the thread again after the confirm step
`lets-shape` SHALL fetch the thread again after the confirm step in Shape one issue, and after the parent issue's creation in Ingest, whether or not the earlier fetch found an unread comment. In Revision mode it SHALL fetch again after an issue's confirm step only when it asked at least one question on that issue. A comment the earlier fetch did not return, or whose last edit date changed, SHALL be shown and asked about like the others. In Shape one issue and Revision mode, when a yes changes the body, shaping SHALL confirm the updated body with the user and write it with `gh issue edit <i> --body-file <file>`. A dismissed comment, or one that changes only the map, SHALL write no body. In Ingest, when a point goes into the parent, shaping SHALL confirm the updated parent body and write it with `gh issue edit <parent> --body-file <file>`. Shaping SHALL repeat the fetch until it returns nothing new.

#### Scenario: A comment arrives during the interview
- **WHEN** a collaborator comments after shaping's first fetch and before the confirm step
- **THEN** shaping shows that comment and asks about it before it posts the reply, and the reply lists it

#### Scenario: A comment arrives on a thread that was empty
- **WHEN** the first fetch found no comment, and a collaborator comments during the interview
- **THEN** the second fetch returns it, and shaping shows it and asks about it

#### Scenario: A comment arrives while Revision mode judges a story
- **WHEN** a collaborator comments on a linked story after its first fetch and before its reply
- **THEN** shaping shows that comment, asks about it, and lists it in that story's reply

#### Scenario: A story with nothing to ask in Revision mode
- **WHEN** a linked story's comments are all labelled `read`
- **THEN** shaping fetches its thread once, asks nothing, and posts no reply

#### Scenario: A second-fetch comment the user dismisses
- **WHEN** the second fetch in Revision mode returns one new comment and the user dismisses it
- **THEN** shaping writes no body, and the reply lists it as `Dismissed:`

### Requirement: One reply records the fold
When the run judged at least one unread comment on an issue, `lets-shape` SHALL post exactly one comment on that issue after its confirm step completes. It SHALL post it with `gh issue comment <i> --body-file <file>`. The confirm step completes when shaping writes the body or the parent issue, or when the user confirms that an existing packet stands unchanged. In Revision mode it completes when shaping writes the folded body, or when the user has answered the last question on that issue and nothing was folded. When the packet stands unchanged, shaping SHALL write no body and SHALL leave the Project fields as they are. The reply's first line SHALL be exactly `lets-shape read this thread.` It SHALL then list every comment judged this run. Each line SHALL start `Folded:` with what changed, `Taken into #<parent>:` with where it went, `Map updated:` with the stage and what changed, or `Dismissed:` with why. A comment that changed the body SHALL get `Folded:`, and that line SHALL also name any map change the same comment made. `Map updated:` SHALL be used only when the comment changed the map and not the body. Each line SHALL name the comment's author without `@`, and its date. A pass that stops before the confirm step completes SHALL post no reply.

#### Scenario: Two folded, one dismissed
- **WHEN** shaping read three unread comments, folded two and dismissed one, and wrote the body
- **THEN** the issue's newest comment starts `lets-shape read this thread.`, holds two `Folded:` lines and one `Dismissed:` line, and is newer than the body edit

#### Scenario: Everything dismissed on a shaped issue
- **WHEN** an already-shaped issue has one unread comment, the user dismisses it, and confirms the packet stands unchanged
- **THEN** shaping posts a reply with one `Dismissed:` line, writes no body, and the issue's Status is as it was

#### Scenario: The pass stops at size XL
- **WHEN** shaping asked about two comments and then stops because the story's size is XL
- **THEN** no body is written and no reply is posted

#### Scenario: A map change in Revision mode
- **WHEN** the user says yes to a comment that moved a stage's link to #140, and the story's body is unchanged
- **THEN** `discovery.md` links #140 at that stage before the reply is posted, and that story's reply holds one `Map updated:` line naming the stage and #140

#### Scenario: One reply per story in Revision mode
- **WHEN** Revision mode judged comments on #87 and on #102
- **THEN** #87 gets one reply and #102 gets one reply, each after its own confirm step

#### Scenario: The reference names the item
- **WHEN** the skill-interfaces test reads `skills/lets-shape/references/issue-comments.md`
- **THEN** it finds `Map updated:`
