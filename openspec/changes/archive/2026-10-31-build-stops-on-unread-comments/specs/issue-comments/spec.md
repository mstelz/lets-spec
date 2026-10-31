## ADDED Requirements

### Requirement: Build reads the thread before it claims
In Confirm the packet, `lets-build` SHALL fetch the issue's body edit date, comments and read markers with the thread query the reference gives, paging as the reference says. It SHALL link `../lets-shape/references/issue-comments.md` rather than restate the query, the labels or the marker. It SHALL run the check for `next` and for a named issue alike, after the required-lines check and before it claims the issue.

#### Scenario: The skill links the reference
- **WHEN** the skill-interfaces test reads `skills/lets-build/SKILL.md`
- **THEN** it finds the link `](../lets-shape/references/issue-comments.md)`, and the link resolves inside the installed skills in each built flow

#### Scenario: The same check for `next`
- **WHEN** `next` selects an issue whose thread has a comment newer than its watermark
- **THEN** the run stops the same way as for a named issue, and does not move on to another candidate

### Requirement: The watermark is the later of the body's last edit and the newest read marker
`lets-build` SHALL take the watermark as the later of the issue's `lastEditedAt` and the newest read marker's `createdAt`. A read marker counts only as the reference defines it: the fixed first line from a `candidate` author. When the body was never edited and there is no marker, every comment SHALL count as newer than the watermark.

#### Scenario: A body edit after the marker
- **WHEN** a MEMBER edited the body on day 3, the newest read marker is from day 2, and a comment from day 2 is the newest comment
- **THEN** the run goes on to Route, because the watermark is day 3

#### Scenario: A marker after the body edit
- **WHEN** the body was last edited on day 2, a COLLABORATOR's read marker is from day 3, and the newest other comment is from day 4
- **THEN** the run stops, and names only the day 4 comment

#### Scenario: An outsider's marker line
- **WHEN** the newest comment with the marker's first line is from an author with association NONE, posted on day 4, and the body was last edited on day 2
- **THEN** the run stops, and names that comment

#### Scenario: Never edited, never read
- **WHEN** the issue's `lastEditedAt` is null, no comment is a read marker, and the issue has one comment
- **THEN** the run stops, and names that comment

### Requirement: A comment newer than the watermark stops the run
`lets-build` SHALL stop before Claim when any comment's `createdAt`, or its `lastEditedAt` when it has one, is after the watermark. Who wrote the comment SHALL make no difference. A read marker SHALL never stop the run. When no comment is newer, the run SHALL go on to Route.

#### Scenario: A new comment from a bot
- **WHEN** the newest comment is from a GitHub App and is after the watermark
- **THEN** the run stops and does not claim the issue

#### Scenario: A comment edited after the watermark
- **WHEN** a comment was posted before the watermark and edited after it
- **THEN** the run stops and does not claim the issue

#### Scenario: Shaping read the thread
- **WHEN** every comment is older than the newest read marker and none was edited after it
- **THEN** the run goes on to Route

#### Scenario: No comments
- **WHEN** the issue has no comments
- **THEN** the run goes on to Route

### Requirement: The stop sends the thread to shaping
When it stops on unread comments, `lets-build` SHALL say how many comments shaping has not read. It SHALL name each one's author without `@`, as `ghost` when the account is deleted, and the date that put it past the watermark: its edit date when it has one, else its creation date. It SHALL say to run the `lets-shape` skill on #<i>. It SHALL show nothing of what a comment says.

#### Scenario: Two unread comments
- **WHEN** two comments are newer than the watermark, one from a MEMBER and one from a deleted account
- **THEN** the stop lists two lines, the member's login and date, then `ghost` and its date
- **AND** it says to run the `lets-shape` skill on #<i>, and quotes neither comment
