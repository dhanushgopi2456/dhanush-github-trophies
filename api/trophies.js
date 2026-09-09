const GITHUB_API = "https://api.github.com/graphql";

const TROPHIES = [
  {
    icon: "🚀",
    title: "First Launch",
    description: "Created your first public repository",
    value: (s) => s.repositories,
    target: 1,
    label: "Repositories",
  },
  {
    icon: "💻",
    title: "Code Builder",
    description: "Created multiple repositories",
    value: (s) => s.repositories,
    target: 10,
    label: "Repositories",
  },
  {
    icon: "📊",
    title: "Active Developer",
    description: "Made significant GitHub contributions",
    value: (s) => s.contributions,
    target: 100,
    label: "Contributions",
  },
  {
    icon: "⭐",
    title: "Star Collector",
    description: "Received stars on your repositories",
    value: (s) => s.stars,
    target: 10,
    label: "Stars",
  },
  {
    icon: "🔀",
    title: "Pull Master",
    description: "Created pull requests on GitHub",
    value: (s) => s.pullRequests,
    target: 10,
    label: "Pull Requests",
  },
  {
    icon: "💬",
    title: "Community Contributor",
    description: "Participated in GitHub discussions",
    value: (s) => s.discussions,
    target: 5,
    label: "Discussions",
  },
  {
    icon: "🐛",
    title: "Bug Hunter",
    description: "Created or participated in issues",
    value: (s) => s.issues,
    target: 10,
    label: "Issues",
  },
  {
    icon: "🤝",
    title: "Open Source",
    description: "Contributed to open-source repositories",
    value: (s) => s.pullRequests,
    target: 5,
    label: "PR Contributions",
  },
  {
    icon: "🏗️",
    title: "Project Architect",
    description: "Maintained a collection of projects",
    value: (s) => s.repositories,
    target: 5,
    label: "Projects",
  },
  {
    icon: "🧠",
    title: "Problem Solver",
    description: "Built solutions through consistent coding",
    value: (s) => s.contributions,
    target: 100,
    label: "Contributions",
  },
  {
    icon: "👑",
    title: "Elite Developer",
    description: "Reached an advanced contribution milestone",
    value: (s) => s.contributions,
    target: 500,
    label: "Contributions",
  },
  {
    icon: "💎",
    title: "Legendary",
    description: "Reached an exceptional contribution milestone",
    value: (s) => s.contributions,
    target: 1000,
    label: "Contributions",
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/*
 * Break text into short lines so SVG text never overlaps
 * neighboring cards.
 */
function wrapText(text, maxLength = 30) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;

    if (test.length <= maxLength) {
      current = test;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 2);
}

async function githubGraphQL(query, variables) {
  const response = await fetch(GITHUB_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0].message);
  }

  return data.data;
}

async function getGitHubStats(username) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        repositories(
          first: 100
          ownerAffiliations: OWNER
          privacy: PUBLIC
        ) {
          totalCount
          nodes {
            stargazerCount
          }
        }

        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount

          issueContributions(first: 1) {
            totalCount
          }

          pullRequestContributions(first: 1) {
            totalCount
          }

          repositoryContributions(first: 1) {
            totalCount
          }

          discussionContributions(first: 1) {
            totalCount
          }

          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

  const data = await githubGraphQL(query, {
    login: username,
  });

  const user = data.user;

  if (!user) {
    throw new Error("GitHub user not found");
  }

  const contributions = user.contributionsCollection;

  const stars = user.repositories.nodes.reduce(
    (total, repo) => total + repo.stargazerCount,
    0
  );

  return {
    repositories: user.repositories.totalCount,

    stars,

    contributions:
      contributions.contributionCalendar.totalContributions,

    commits:
      contributions.totalCommitContributions +
      contributions.restrictedContributionsCount,

    issues:
      contributions.issueContributions.totalCount,

    pullRequests:
      contributions.pullRequestContributions.totalCount,

    discussions:
      contributions.discussionContributions.totalCount,

    repositoryContributions:
      contributions.repositoryContributions.totalCount,
  };
}

function createSvg(username, stats) {
  /*
   * FIXED LAYOUT
   *
   * 6 columns × 2 rows
   * Smaller cards + proper gaps
   * Prevents the right-side clipping/overlap
   */

  const svgWidth = 1500;
  const svgHeight = 650;

  const columns = 6;
  const rows = 2;

  const cardWidth = 220;
  const cardHeight = 245;

  const gapX = 18;
  const gapY = 18;

  const startX = 27;
  const startY = 105;

  const unlockedColor = "#087f45";

  let cards = "";

  TROPHIES.forEach((trophy, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    const x = startX + column * (cardWidth + gapX);
    const y = startY + row * (cardHeight + gapY);

    const value = Number(trophy.value(stats)) || 0;

    const isUnlocked = value >= trophy.target;

    const background = isUnlocked
      ? "#f0fdf4"
      : "#f8fafc";

    const border = isUnlocked
      ? "#86efac"
      : "#d1d5db";

    const titleColor = isUnlocked
      ? "#172033"
      : "#64748b";

    const valueColor = isUnlocked
      ? unlockedColor
      : "#64748b";

    const statusBackground = isUnlocked
      ? "#dcfce7"
      : "#e5e7eb";

    const statusText = isUnlocked
      ? "✓ Unlocked"
      : "🔒 Locked";

    const descriptionLines = wrapText(
      trophy.description,
      30
    );

    const descriptionSvg = descriptionLines
      .map(
        (line, lineIndex) => `
          <text
            x="${x + cardWidth / 2}"
            y="${y + 125 + lineIndex * 17}"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="12"
            fill="#475569"
          >${escapeXml(line)}</text>
        `
      )
      .join("");

    cards += `
      <g>

        <!-- Card -->

        <rect
          x="${x}"
          y="${y}"
          width="${cardWidth}"
          height="${cardHeight}"
          rx="16"
          fill="${background}"
          stroke="${border}"
          stroke-width="2"
        />

        <!-- Icon -->

        <text
          x="${x + cardWidth / 2}"
          y="${y + 50}"
          text-anchor="middle"
          font-size="38"
        >${escapeXml(trophy.icon)}</text>

        <!-- Title -->

        <text
          x="${x + cardWidth / 2}"
          y="${y + 91}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="17"
          font-weight="700"
          fill="${titleColor}"
        >${escapeXml(trophy.title)}</text>

        <!-- Description -->

        ${descriptionSvg}

        <!-- Value -->

        <text
          x="${x + cardWidth / 2}"
          y="${y + 178}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="30"
          font-weight="800"
          fill="${valueColor}"
        >${value}${isUnlocked ? "+" : ""}</text>

        <!-- Label -->

        <text
          x="${x + cardWidth / 2}"
          y="${y + 201}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="12"
          fill="#64748b"
        >${escapeXml(trophy.label)}</text>

        <!-- Status -->

        <rect
          x="${x + 50}"
          y="${y + 213}"
          width="120"
          height="27"
          rx="13"
          fill="${statusBackground}"
        />

        <text
          x="${x + cardWidth / 2}"
          y="${y + 232}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="12"
          font-weight="700"
          fill="${isUnlocked ? unlockedColor : "#64748b"}"
        >${escapeXml(statusText)}</text>

      </g>
    `;
  });

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${svgWidth}"
  height="${svgHeight}"
  viewBox="0 0 ${svgWidth} ${svgHeight}"
>

  <!-- Main Background -->

  <rect
    width="${svgWidth}"
    height="${svgHeight}"
    rx="22"
    fill="#ffffff"
    stroke="#dbeafe"
    stroke-width="2"
  />

  <!-- Header -->

  <text
    x="38"
    y="55"
    font-family="Arial, sans-serif"
    font-size="30"
    font-weight="800"
    fill="#172033"
  >🏆 GitHub Achievements</text>

  <text
    x="${svgWidth - 40}"
    y="52"
    text-anchor="end"
    font-family="Arial, sans-serif"
    font-size="16"
    font-style="italic"
    fill="#475569"
  >Small Commits. Big Progress. 🚀</text>

  <!-- Trophy Cards -->

  ${cards}

  <!-- Footer -->

  <text
    x="38"
    y="630"
    font-family="Arial, sans-serif"
    font-size="13"
    fill="#64748b"
  >${escapeXml(username)} • Automatically generated from GitHub activity</text>

</svg>
`;
}

export default async function handler(req, res) {
  try {
    const username =
      req.query?.username ||
      req.query?.user ||
      "dhanushgopi2456";

    if (!process.env.TOKEN) {
      throw new Error(
        "TOKEN environment variable is missing"
      );
    }

    const stats = await getGitHubStats(username);

    const svg = createSvg(
      username,
      stats
    );

    res.setHeader(
      "Content-Type",
      "image/svg+xml"
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600"
    );

    return res
      .status(200)
      .send(svg);

  } catch (error) {

    res.setHeader(
      "Content-Type",
      "image/svg+xml"
    );

    return res
      .status(500)
      .send(`
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="900"
          height="180"
        >

          <rect
            width="900"
            height="180"
            fill="#ffffff"
          />

          <text
            x="30"
            y="70"
            font-family="Arial"
            font-size="24"
            font-weight="bold"
            fill="#dc2626"
          >
            GitHub Trophy API Error
          </text>

          <text
            x="30"
            y="115"
            font-family="Arial"
            font-size="16"
            fill="#475569"
          >
            ${escapeXml(error.message)}
          </text>

        </svg>
      `);
  }
}
