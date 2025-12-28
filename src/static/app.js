document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Append/refresh participants for a specific activity card after successful signup
  function updateParticipantsUI(activityName, email) {
    const card = Array.from(document.querySelectorAll("#activities-list .activity-card"))
      .find(c => c.querySelector("h4")?.textContent?.trim() === activityName);
    if (!card) return;

    // Ensure participants section exists
    let section = card.querySelector(".participants-section");
    if (!section) {
      section = document.createElement("div");
      section.className = "participants-section";
      const title = document.createElement("h5");
      title.textContent = "Participants";
      const list = document.createElement("ul");
      list.className = "participants-list";
      section.appendChild(title);
      section.appendChild(list);
      card.appendChild(section);
    }

    const list = section.querySelector(".participants-list");

    // Remove "No participants yet" placeholder if present
    const emptyItem = list.querySelector(".participant-item.empty");
    if (emptyItem) emptyItem.remove();

    // Avoid duplicate entries
    const exists = Array.from(list.querySelectorAll("li"))
      .some(li => li.querySelector('.participant-email')?.textContent?.trim() === email);
    if (!exists) {
      const li = document.createElement("li");
      li.className = "participant-item";
      li.innerHTML = `
        <span class="participant-email">${email}</span>
        <span class="participant-actions">
          <button class="participant-remove" title="Unregister" aria-label="Unregister">✕</button>
        </span>
      `;
      list.appendChild(li);
    }

    // Decrement availability shown on the card
    const availabilityP = Array.from(card.querySelectorAll("p"))
      .find(p => p.textContent.includes("Availability:"));
    if (availabilityP) {
      const m = availabilityP.textContent.match(/(\d+)\s+spots/);
      if (m) {
        const spotsLeft = Math.max(parseInt(m[1], 10) - 1, 0);
        availabilityP.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
      }
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Update participants list asynchronously for the selected activity
        updateParticipantsUI(activity, email);

        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
