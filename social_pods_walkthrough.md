# FocusFlow Social Pods Feature Implementation Walkthrough

We have successfully designed, built, and verified the **Social Pods** feature for FocusFlow, which introduces group-based accountability, gamified streaks, and shared focus quests for friends.

Below is a detailed breakdown of the components, database upgrades, controller logic, and user interface modules created to support this feature.

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
