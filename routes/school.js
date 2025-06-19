const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

router.post('/addSchool', async (req, res) => {
  const { name, address, latitude, longitude } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Valid name is required' });
  }
  if (!address || typeof address !== 'string' || address.trim() === '') {
    return res.status(400).json({ error: 'Valid address is required' });
  }
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    return res.status(400).json({ error: 'Valid latitude (-90 to 90) is required' });
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Valid longitude (-180 to 180) is required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
      [name.trim(), address.trim(), latitude, longitude]
    );
    res.status(201).json({ message: 'School added successfully', schoolId: result.insertId });
  } catch (error) {
    console.error('Error adding school:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/listSchools', async (req, res) => {
  const { latitude, longitude } = req.query;
  if (!latitude || isNaN(parseFloat(latitude)) || parseFloat(latitude) < -90 || parseFloat(latitude) > 90) {
    return res.status(400).json({ error: 'Valid latitude (-90 to 90) is required' });
  }
  if (!longitude || isNaN(parseFloat(longitude)) || parseFloat(longitude) < -180 || parseFloat(longitude) > 180) {
    return res.status(400).json({ error: 'Valid longitude (-180 to 180) is required' });
  }
  const userLat = parseFloat(latitude);
  const userLon = parseFloat(longitude);
  try {
    const [schools] = await pool.query('SELECT * FROM schools');
    const schoolsWithDistance = schools.map(school => ({
      ...school,
      distance: calculateDistance(userLat, userLon, school.latitude, school.longitude)
    })).sort((a, b) => a.distance - b.distance);
    res.json(schoolsWithDistance);
  } catch (error) {
    console.error('Error listing schools:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;