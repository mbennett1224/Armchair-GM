import axios from 'axios';

const BASE_URL = 'https://statsapi.mlb.com/api/v1';

// Fetch all MLB teams
const getAllTeams = async () => {
  const response = await axios.get(`${BASE_URL}/teams?sportId=1`);
  return response.data.teams;
};

// Fetch roster for a specific team
const getTeamRoster = async (teamId) => {
  const response = await axios.get(`${BASE_URL}/teams/${teamId}/roster`);
  return response.data.roster;
};

// Fetch stats for a specific player
const getPlayerStats = async (playerId) => {
  const response = await axios.get(`${BASE_URL}/people/${playerId}?hydrate=stats(group=[hitting,pitching],type=[season])`);
  return response.data.people[0];
};

// Fetch all player stats from all teams
export const getAllPlayersStats = async () => {
  const teams = await getAllTeams();
  const allPlayers = [];

  for (const team of teams) {
    const roster = await getTeamRoster(team.id);

    for (const player of roster) {
      try {
        const playerData = await getPlayerStats(player.person.id);
        allPlayers.push({
          team: team.name,
          name: playerData.fullName,
          position: player.position?.abbreviation,
          stats: playerData.stats || [],
        });
      } catch (err) {
        console.warn(`Failed to fetch stats for player ${player.person.fullName}`);
      }
    }
  }

  return allPlayers;
};
