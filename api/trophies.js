const GITHUB_API = "https://api.github.com/graphql";

/*
|--------------------------------------------------------------------------
| GitHub Achievement Definitions
|--------------------------------------------------------------------------
*/

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
    icon: "📝",
    title: "Commit Master",
    description: "Made consistent code contributions",
    value: (s) => s.commits,
    target: 100,
    label: "Commits",
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
    description: "Contributed across different repositories",
    value: (s) => s.repositoryContributions,
    target: 5,
    label: "Repositories",
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


/*
|--------------------------------------------------------------------------
| XML Escape Helper
|--------------------------------------------------------------------------
*/

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


/*
|--------------------------------------------------------------------------
| Text Wrapping
|--------------------------------------------------------------------------
|
| Prevents long descriptions from touching neighboring cards.
|
*/

function wrapText(text, maxLength = 29) {
  const words = text.split(" ");
  const lines = [];

  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine
      ? `${currentLine} ${word}`
      : word;

    if (testLine.length <= maxLength) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 2);
}


/*
|--------------------------------------------------------------------------
| GitHub GraphQL Request
|--------------------------------------------------------------------------
*/

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
    throw new Error(
      `GitHub API returned ${response.status}`
    );
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    throw new Error(
      data.errors
        .map((error) => error.message)
        .join(" | ")
    );
  }

  return data.data;
}


/*
|--------------------------------------------------------------------------
| Get GitHub Statistics
|--------------------------------------------------------------------------
*/

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

          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

  const data = await githubGraphQL(
    query,
    {
      login: username,
    }
  );

  const user = data.user;

  if (!user) {
    throw new Error(
      "GitHub user not found"
    );
  }

  const contributions =
    user.contributionsCollection;


  /*
   * Calculate total stars
   */

  const stars =
    user.repositories.nodes.reduce(
      (total, repository) =>
        total + repository.stargazerCount,
      0
    );


  /*
   * Calculate commits
   */

  const commits =
    contributions.totalCommitContributions +
    contributions.restrictedContributionsCount;


  /*
   * Return all statistics
   */

  return {
    repositories:
      user.repositories.totalCount,

    stars,

    contributions:
      contributions.contributionCalendar
        .totalContributions,

    commits,

    issues:
      contributions.issueContributions
        .totalCount,

    pullRequests:
      contributions.pullRequestContributions
        .totalCount,

    repositoryContributions:
      contributions.repositoryContributions
        .totalCount,
  };
}


/*
|--------------------------------------------------------------------------
| Create Trophy SVG
|--------------------------------------------------------------------------
*/

function createSvg(username, stats) {

  /*
   * Overall SVG dimensions
   */

  const svgWidth = 1500;
  const svgHeight = 650;


  /*
   * Grid configuration
   */

  const columns = 6;

  const cardWidth = 220;
  const cardHeight = 245;

  const gapX = 18;
  const gapY = 18;

  const startX = 27;
  const startY = 105;


  /*
   * Colors
   */

  const unlockedGreen = "#087f45";

  const unlockedBackground = "#f0fdf4";
  const unlockedBorder = "#86efac";

  const lockedBackground = "#f8fafc";
  const lockedBorder = "#d1d5db";

  const darkText = "#172033";
  const mutedText = "#475569";
  const grayText = "#64748b";


  /*
   * Trophy card SVG
   */

  let cards = "";


  TROPHIES.forEach((trophy, index) => {

    const column = index % columns;

    const row =
      Math.floor(index / columns);


    /*
     * Calculate card position
     */

    const x =
      startX +
      column * (cardWidth + gapX);

    const y =
      startY +
      row * (cardHeight + gapY);


    /*
     * Current statistic
     */

    const rawValue =
      trophy.value(stats);

    const value =
      Number(rawValue) || 0;


    /*
     * Achievement status
     */

    const isUnlocked =
      value >= trophy.target;


    /*
     * Dynamic colors
     */

    const background =
      isUnlocked
        ? unlockedBackground
        : lockedBackground;

    const border =
      isUnlocked
        ? unlockedBorder
        : lockedBorder;

    const titleColor =
      isUnlocked
        ? darkText
        : grayText;

    const valueColor =
      isUnlocked
        ? unlockedGreen
        : grayText;

    const statusBackground =
      isUnlocked
        ? "#dcfce7"
        : "#e5e7eb";

    const statusColor =
      isUnlocked
        ? unlockedGreen
        : grayText;

    const statusText =
      isUnlocked
        ? "✓ Unlocked"
        : "🔒 Locked";


    /*
     * Wrap description
     */

    const descriptionLines =
      wrapText(
        trophy.description,
        29
      );


    /*
     * Generate description SVG
     */

    const descriptionSvg =
      descriptionLines
        .map(
          (line, lineIndex) => `
            <text
              x="${x + cardWidth / 2}"
              y="${y + 126 + lineIndex * 17}"
              text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="12"
              fill="${mutedText}"
            >${escapeXml(line)}</text>
          `
        )
        .join("");


    /*
     * Generate complete card
     */

    cards += `
      <g>

        <!-- Card background -->

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


        <!-- Trophy icon -->

        <text
          x="${x + cardWidth / 2}"
          y="${y + 51}"
          text-anchor="middle"
          font-size="38"
        >${escapeXml(trophy.icon)}</text>


        <!-- Trophy title -->

        <text
          x="${x + cardWidth / 2}"
          y="${y + 92}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="17"
          font-weight="700"
          fill="${titleColor}"
        >${escapeXml(trophy.title)}</text>


        <!-- Trophy description -->

        ${descriptionSvg}


        <!-- Achievement value -->

        <text
          x="${x + cardWidth / 2}"
          y="${y + 179}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="30"
          font-weight="800"
          fill="${valueColor}"
        >${value}${isUnlocked ? "+" : ""}</text>


        <!-- Value label -->

        <text
          x="${x + cardWidth / 2}"
          y="${y + 201}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="12"
          fill="${grayText}"
        >${escapeXml(trophy.label)}</text>


        <!-- Status background -->

        <rect
          x="${x + 50}"
          y="${y + 213}"
          width="120"
          height="27"
          rx="13"
          fill="${statusBackground}"
        />


        <!-- Status text -->

        <text
          x="${x + cardWidth / 2}"
          y="${y + 232}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="12"
          font-weight="700"
          fill="${statusColor}"
        >${escapeXml(statusText)}</text>

      </g>
    `;
  });


  /*
   * Complete SVG
   */

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${svgWidth}"
  height="${svgHeight}"
  viewBox="0 0 ${svgWidth} ${svgHeight}"
>

  <!-- Main white background -->

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
    fill="${darkText}"
  >🏆 GitHub Achievements</text>


  <!-- Header slogan -->

  <text
    x="${svgWidth - 40}"
    y="52"
    text-anchor="end"
    font-family="Arial, sans-serif"
    font-size="16"
    font-style="italic"
    fill="${mutedText}"
  >Small Commits. Big Progress. 🚀</text>


  <!-- Trophy cards -->

  ${cards}


  <!-- Footer -->

  <text
    x="38"
    y="630"
    font-family="Arial, sans-serif"
    font-size="13"
    fill="${grayText}"
  >${escapeXml(username)} • Automatically generated from GitHub activity</text>

</svg>
`;
}


/*
|--------------------------------------------------------------------------
| Vercel API Handler
|--------------------------------------------------------------------------
*/

export default async function handler(req, res) {

  try {

    /*
     * Username from URL
     */

    const username =
      req.query?.username ||
      req.query?.user ||
      "dhanushgopi2456";


    /*
     * Check GitHub token
     */

    if (!process.env.TOKEN) {
      throw new Error(
        "TOKEN environment variable is missing"
      );
    }


    /*
     * Fetch GitHub statistics
     */

    const stats =
      await getGitHubStats(username);


    /*
     * Generate SVG
     */

    const svg =
      createSvg(
        username,
        stats
      );


    /*
     * Response headers
     */

    res.setHeader(
      "Content-Type",
      "image/svg+xml"
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600"
    );


    /*
     * Return SVG
     */

    return res
      .status(200)
      .send(svg);

  } catch (error) {

    /*
     * Error response
     */

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
            font-family="Arial, sans-serif"
            font-size="24"
            font-weight="bold"
            fill="#dc2626"
          >
            GitHub Trophy API Error
          </text>

          <text
            x="30"
            y="115"
            font-family="Arial, sans-serif"
            font-size="16"
            fill="#475569"
          >
            ${escapeXml(error.message)}
          </text>

        </svg>
      `);
  }
}
