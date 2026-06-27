# FocusFlow Social Pods Feature Implementation Walkthrough

We have successfully designed, built, and verified the **Social Pods** feature for FocusFlow, which introduces group-based accountability, gamified streaks, and shared focus quests for friends.

Below is a detailed breakdown of the components, database upgrades, controller logic, and user interface modules created to support this feature.

---

## Guide for New Users & Practical Use Cases

If you are new to FocusFlow Social Pods, here is how you can get started and how pods function in action.

### How to Use Social Pods: A Step-by-Step Guide
1. **Create or Join a Pod**: Go to the **Social Pods** tab in the sidebar. If you are not in a pod yet, click **Form a Study Pod**. Enter a name and an encouraging description.
2. **Invite Your Friends**: Once your pod is active, click **Invite Friends** on the dashboard. Type in their name or email to send an in-app invite.
3. **Accepting Invites**: When your friends log in, they will see a prominent banner at the top of their screen notifying them of the invite. Tapping **Accept** instantly joins them to the pod dashboard.
4. **Study & Earn XP**: Start focus sessions from your dashboard or Chrome extension. Every completed study session rewards you with **10 XP** (up to a daily maximum of 100 XP) and logs an update to the pod feed.
5. **Team Up on Challenges**: Click **Start Challenge** to create a group quest (e.g., "Midterm Prep" targeting 150 XP by Friday). Every member's focus session contributions will advance the group progress bar.
6. **Support Your Crew**: Check the leaderboard. If a friend is lagging, send them a Poke (👉) nudge. If they finish a major study block, celebrate by sending a Clap (👏) nudge!

---

### Real-World Use Cases

#### Use Case 1: Preparing for Finals with Group Quests
* **Scenario**: Alice, Bob, and Carol are studying for their upcoming Computer Science final exam.
* **Flow**:
  - Alice forms a pod called *"CS Final Destroyers"* and invites Bob and Carol.
  - She sets up a group challenge: *"Calculus & DSA Prep"* with a target of **300 collective XP** before Friday.
  - Whenever Bob completes a 25-minute Pomodoro session studying algorithms, the pod's live feed updates: *"Bob completed a study session for 'DSA Practice' (+10 XP)"*.
  - The challenge progress bar moves up to `10/300`.
  - Seeing Bob study, Carol feels motivated, starts her session, and completes it, pushing the progress bar further. By working together, they hit the 300 XP target, unlocking the completed quest achievement.

#### Use Case 2: The Daily Streak Accountability Loop
* **Scenario**: Khushal wants to build a consistent study habit without missing days, but struggles with staying motivated on weekends.
* **Flow**:
  - Khushal joins a pod with his friends.
  - To maintain their **Pod Streak**, every single member of the pod must complete at least one focus session every calendar day.
  - On Sunday evening, Khushal hasn't studied yet. He receives an in-app notification saying: *"Virat poked you! Time to get to work!"*.
  - Khushal opens the app, starts a focus session on his task, and completes it.
  - The pod streak is saved, maintaining their 5-day streak and logging: *"Amazing! Everyone completed their sessions today! Pod streak is now 6 days! 🚀"*.

#### Use Case 3: Privacy-Aware Study Session
* **Scenario**: Harshal wants to study a sensitive or personal task, but doesn't want his friends in the pod to see the title of what he is working on.
* **Flow**:
  - When creating a task for his personal chore, Harshal unchecks the **"Share session completions with my Pod"** option in the Task Form.
  - He starts and completes a focus session on this task.
  - He still earns 10 XP towards his personal level and the active group challenges.
  - In the pod's feed, it is announced anonymously: *"Harshal completed a study session for a private task (+10 XP)"*. His friends know he is working hard, but the private details remain hidden.

---

## 1. Mongoose Database Models

### 1.1 [Pod.js](file:///d:/Personal/FocusFlow/server/models/Pod.js) (New)
The core pod schema representing accountability groups (limited to 3–4 friends):
- **Fields:**
  - `name`: Required trimmed string.
  - `description`: String detailing the pod's focus.
  - `leaderId`: User object reference representing the pod creator/admin.
  - `streak`: Current consecutive day count where all member students completed a study block.
  - `lastActiveDate`: Track YYYY-MM-DD for maintaining streaks.
  - `members`: Sub-document array of user reference, joined date, and role (`leader` vs `member`).
  - `challenges`: Embedded list of group study challenges holding title, target XP, progress map (User -> XP contributed), status (`active` vs `completed`), and end date.

### 1.2 [PodInvite.js](file:///d:/Personal/FocusFlow/server/models/PodInvite.js) (New)
Tracks invite requests exchanged between peers:
- **Fields:** `podId`, `fromUserId`, `toUserId`, `status` (`pending`, `accepted`, `declined`), and `sentAt`. Contains unique indexes to prevent redundant pending invites.

### 1.3 [PodActivity.js](file:///d:/Personal/FocusFlow/server/models/PodActivity.js) (New)
Chronological log mapping events shown in the Pod's live social feed:
- **Fields:** `podId`, `userId`, `type` (`completion`, `miss`, `recovery`, `join`, `challenge`), `message`, and `createdAt`.

### 1.4 Schema Extensions
- **[User.js](file:///d:/Personal/FocusFlow/server/models/User.js)**: Added `xp`, `streak`, and `lastActiveDate` properties.
- **[Notification.js](file:///d:/Personal/FocusFlow/server/models/Notification.js)**: Appended `pod` to the notification types enum.
- **[Task.js](file:///d:/Personal/FocusFlow/server/models/Task.js)**: Appended `shareWithPod` (default true) toggle supporting task details privacy.

---

## 2. Backend Controller Logic & Routes

### 2.1 [podController.js](file:///d:/Personal/FocusFlow/server/controllers/podController.js) (New)
- **createPod**: Configures a new pod with creator set as leader, auto-adds them to members, and logs a join feed message.
- **getUserPods**: Queries all pods the current user belongs to, populating member statistics (XP, streaks).
- **getPodDetails**: Validates membership, retrieves member profiles, active challenges progress, and lists recent feed activities.
- **inviteMember**: Submits a pending `PodInvite` and dispatches an in-app type `pod` notification to the recipient.
- **respondToInvite**: Processes accept/decline actions, updates pod member lists, registers the user in active challenges, and announces the entry on the pod's timeline.
- **leavePod**: Removes a member. If the leader leaves, reassigns leadership or dissolves the pod if no users remain.
- **sendNudge**: Generates a standard nudge in-app notification (Clap 👏, Encourage 💪, Poke 👉) targeting a member.
- **createChallenge**: Adds a collaborative challenge (e.g. collective 200 XP target) and publishes a challenge banner to the feed.

### 2.2 [authController.js](file:///d:/Personal/FocusFlow/server/controllers/authController.js) & [scheduleController.js](file:///d:/Personal/FocusFlow/server/controllers/scheduleController.js)
- Added `/api/auth/search` endpoint to query user profiles by name/email (excluding the logged-in user).
- Hooked session completions in `focusController.js` to reward 10 XP (capped at 100 XP per day per user), advance team challenges, evaluate and increment daily pod streaks, and dispatch activity feed updates.
- Hooked schedule recovery actions in `scheduleController.js` to post rescheduling feed messages when missed sessions are recovered.

---

## 3. Frontend Pages & Components

### 3.1 [Pods.jsx](file:///d:/Personal/FocusFlow/client/src/pages/Pods.jsx) (New Dashboard)
A gorgeous, responsive multi-pane layout styled using the sky blue/teal theme:
- **Leaderboard Rankings**: Displays a ranked list of member XP, streaks, and quick action buttons to nudge friends.
- **Active Challenges**: Progress bars tracking collective quest completion.
- **Social Feed Timeline**: Color-coded timeline events for study sessions, recovery events, join alerts, and challenge achievements.
- **Modals**: Easy interfaces to create a new pod, invite buddies by searching username/email, or kick off a new team challenge.

### 3.2 Global Components Integration
- **[Navbar.jsx](file:///d:/Personal/FocusFlow/client/src/components/layout/Navbar.jsx)**: Adds a sticky invitations alert banner at the top of the viewport when pending invites exist, enabling one-click accept/decline. Renders pod notifications with a custom users/group icon.
- **[TaskForm.jsx](file:///d:/Personal/FocusFlow/client/src/components/tasks/TaskForm.jsx)**: Integrated a "Share with Pod" checkbox. Marking a task private hides details in the pod activity timeline.
- **[Sidebar.jsx](file:///d:/Personal/FocusFlow/client/src/components/layout/Sidebar.jsx)**: Appended "Social Pods" navigation menu item.
- **[App.jsx](file:///d:/Personal/FocusFlow/client/src/App.jsx)**: Registered the `/pods` route.

---

## 4. Verification & Health Checks
- **E2E Integration Script**: Executed database tests confirming that invitation dispatching, accepting, XP completions, and privacy-masking rules operate correctly.
- **Client Build Success**: Successfully compiled assets using Vite without any warning or error.
