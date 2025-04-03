const { NavLinks } = require('../model/NewPaper');

// CREATE - Add new navigation links
const createNavLinks = async (req, res) => {
  try {
    const { linksArray } = req.body;
    console.log(linksArray);
    const newNavLinks = new NavLinks({
      links: linksArray
    });
    const savedLinks = await newNavLinks.save();
    res.status(201).json(savedLinks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createMultipleNavLinks = async (req, res) => {
  try {
    const linksArray = req.body;
    
    if (!Array.isArray(linksArray)) {
      return res.status(400).json({ error: 'Input must be an array' });
    }

    // Validate each link
    for (const link of linksArray) {
      if (!link.name || !link.path) {
        return res.status(400).json({ error: 'Each link must have name and path properties' });
      }
    }

    const updated = await NavLinks.findOneAndUpdate(
      {},
      { $push: { links: { $each: linksArray } } },
      { new: true, upsert: true }
    );

    res.status(201).json(updated.links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ - Get all navigation links
const getNavLinks = async (req, res) => {
  try {
    const navLinks = await NavLinks.findOne({})
      .sort({ updatedAt: -1 })
      .limit(1);
      
    const links = navLinks ? navLinks.links : [];
    res.status(200).json(links);
  } catch (error) {
    console.error('Error fetching navigation links:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE - Replace all navigation links
const updateNavLinks = async (req, res) => {
  try {
    const { newLinksArray } = req.body;
    const updated = await NavLinks.findOneAndUpdate(
      {}, 
      { $set: { links: newLinksArray } },
      { new: true, upsert: true }
    );
    res.status(200).json(updated.links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE - Add a single new link
const addSingleNavLink = async (req, res) => {
  try {
    const newLink = req.body;
    const updated = await NavLinks.findOneAndUpdate(
      {},
      { $push: { links: newLink } },
      { new: true, upsert: true }
    );
    res.status(200).json(updated.links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE - Remove a specific link by name or path
const deleteNavLink = async (req, res) => {
  try {
    const { identifier } = req.params;
    const updated = await NavLinks.findOneAndUpdate(
      {},
      { $pull: { links: { $or: [{ name: identifier }, { path: identifier }] } } },
      { new: true }
    );
    const links = updated ? updated.links : [];
    res.status(200).json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE - Clear all navigation links
const clearAllNavLinks = async (req, res) => {
  try {
    const updated = await NavLinks.findOneAndUpdate(
      {},
      { $set: { links: [] } },
      { new: true }
    );
    res.status(200).json(updated.links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createNavLinks,
  createMultipleNavLinks,
  getNavLinks,
  updateNavLinks,
  addSingleNavLink,
  deleteNavLink,
  clearAllNavLinks
};