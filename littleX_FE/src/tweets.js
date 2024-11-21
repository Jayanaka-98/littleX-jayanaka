const token = localStorage.getItem("authToken");
if (!token) {
  window.location.href = "index.html";
}

const BASE_URL = "http://0.0.0.0:8000/walker";
const isProfilePage = window.location.pathname.includes("profile.html");

let currentUserProfile = null;

document.getElementById("logoutButton").addEventListener("click", () => {
  localStorage.removeItem("authToken");
  window.location.href = "index.html";
});

async function loadCurrentUserProfile() {
  try {
    const response = await fetch(`${BASE_URL}/get_profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error("Failed to load profile");
    const data = await response.json();
    if (data.reports && data.reports.length > 0) {
      currentUserProfile = data.reports[0];
      const usernameElement = document.getElementById("username");
      if (usernameElement) {
        usernameElement.textContent =
          currentUserProfile.context.username || "Anonymous";
      }
      return currentUserProfile;
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    const usernameElement = document.getElementById("username");
    if (usernameElement) {
      usernameElement.textContent = "Anonymous";
    }
  }
}

async function loadProfilesToFollow() {
  try {
    const response = await fetch(`${BASE_URL}/load_user_profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error("Failed to load profiles");
    const data = await response.json();

    if (data.reports && data.reports.length > 0) {
      const profiles = data.reports[0];
      const followListElement = document.getElementById("followList");
      followListElement.innerHTML = "";

      profiles.forEach((profile) => {
        // Don't show current user's profile
        if (
          currentUserProfile &&
          profile.name === currentUserProfile.context.username
        )
          return;

        const template = document.getElementById("profile-template");
        const profileElement = template.content.cloneNode(true);

        profileElement.querySelector(".profile-name").textContent =
          profile.name;
        const followBtn = profileElement.querySelector(".follow-btn");

        // Check if already following
        const isFollowing = currentUserProfile?.context.followees?.includes(
          profile.id
        );
        if (isFollowing) {
          followBtn.textContent = "Following";
          followBtn.classList.add("following");
        }

        followBtn.addEventListener("click", () =>
          handleFollow(profile.id, followBtn)
        );

        followListElement.appendChild(profileElement);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function handleFollow(profileId, button) {
  try {
    const response = await fetch(`${BASE_URL}/follow_request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ profile_id: profileId }),
    });

    if (!response.ok) throw new Error("Failed to follow user");

    // Toggle button state
    if (button.classList.contains("following")) {
      button.textContent = "Follow";
      button.classList.remove("following");
    } else {
      button.textContent = "Following";
      button.classList.add("following");
    }

    // Refresh current user's profile
    await loadCurrentUserProfile();
  } catch (error) {
    console.error("Error:", error);
  }
}

// Tweet Functions
function renderComment(comment) {
  const template = document.getElementById("comment-template");
  const commentElement = template.content.cloneNode(true);

  commentElement.querySelector(".username").textContent = "Anonymous";
  commentElement.querySelector(".content").textContent =
    comment.context.content;

  return commentElement;
}

function renderTweet(tweetData) {
  const tweet = tweetData.tweet;
  const comments = tweetData.comments;
  const likes = tweetData.likes;
  const likeCount = likes ? likes.length : 0;

  const template = document.getElementById("tweet-template");
  const tweetElement = template.content.cloneNode(true);

  const tweetHeader = tweetElement.querySelector(".tweet-header");
  if (tweetHeader) {
    tweetHeader.querySelector(".username").textContent = tweet.username;
  } else {
    tweetElement.querySelector(".username").textContent = tweet.username;
  }

  tweetElement.querySelector(".content").textContent =
    tweet.content.context.content;
  tweetElement.querySelector(".like-btn .count").textContent = likeCount;
  tweetElement.querySelector(".comment-btn .count").textContent =
    comments.length;

  const commentsSection = tweetElement.querySelector(".comments-section");
  comments.forEach((comment) => {
    commentsSection.insertBefore(
      renderComment(comment),
      commentsSection.lastElementChild
    );
  });

  const commentBtn = tweetElement.querySelector(".comment-btn");
  commentBtn.addEventListener("click", () => {
    commentsSection.style.display =
      commentsSection.style.display === "none" ? "block" : "none";
  });

  const likeBtn = tweetElement.querySelector(".like-btn");
  likeBtn.addEventListener("click", () => handleLike(tweet.content.id));

  const commentForm = tweetElement.querySelector(".comment-form");
  commentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const content = e.target.querySelector("input").value;
    handleComment(tweet.content.id, content);
    e.target.reset();
  });

  return tweetElement;
}

function renderTweets(tweetsData) {
  const tweetsDiv = document.getElementById(
    isProfilePage ? "userTweets" : "tweets"
  );
  tweetsDiv.innerHTML = "";
  tweetsData.forEach((tweetData) => {
    tweetsDiv.appendChild(renderTweet(tweetData));
  });
}

// Tweet Form Handler
if (!isProfilePage) {
  document
    .getElementById("tweetForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      const content = document.getElementById("tweetContent").value.trim();
      if (!content) return;

      try {
        const response = await fetch(`${BASE_URL}/create_tweet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        });
        if (!response.ok) throw new Error("Failed to create tweet");
        document.getElementById("tweetContent").value = "";
        loadTweets();
      } catch (error) {
        console.error("Error:", error);
      }
    });
}

// Tweet Actions
async function handleLike(tweetId) {
  try {
    const response = await fetch(`${BASE_URL}/like_tweet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tweet_id: tweetId }),
    });
    if (!response.ok) throw new Error("Failed to like tweet");
    isProfilePage ? loadUserTweets() : loadTweets();
  } catch (error) {
    console.error("Error:", error);
  }
}

async function handleComment(tweetId, content) {
  try {
    const response = await fetch(`${BASE_URL}/comment_tweet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tweet_id: tweetId, content }),
    });
    if (!response.ok) throw new Error("Failed to add comment");
    isProfilePage ? loadUserTweets() : loadTweets();
  } catch (error) {
    console.error("Error:", error);
  }
}

// Loading Functions
async function loadTweets() {
  try {
    const response = await fetch(`${BASE_URL}/load_feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error("Failed to load tweets");
    const data = await response.json();
    if (data.reports && data.reports.length > 0) {
      renderTweets(data.reports);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function loadUserTweets() {
  try {
    const response = await fetch(`${BASE_URL}/load_tweets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tweet_info: {} }),
    });
    if (!response.ok) throw new Error("Failed to load tweets");
    const data = await response.json();
    if (data.reports && data.reports.length > 0) {
      renderTweets(data.reports);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Page Initialization
async function initializePage() {
  try {
    await loadCurrentUserProfile();

    if (isProfilePage) {
      await loadUserTweets();
    } else {
      await loadTweets();
      await loadProfilesToFollow();
    }
  } catch (error) {
    console.error("Page initialization error:", error);
  }
}

// Start the initialization
initializePage();
