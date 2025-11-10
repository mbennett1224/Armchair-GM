import express from 'express';
import { getAllPlayersStats } from '../services/baseballApi.js';

const router = express.Router();

router.get('/players', async (req, res) => {
  try {
    const data = await getAllPlayersStats();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all player stats' });
  }
});

export default router;
