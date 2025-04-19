const HeadLine = require('../model/HeadLines');

// CREATE - Add new navigation links
const createHeadLine = async (req, res) => {
  try {
    const { linksArray } = req.body;
    console.log(linksArray);
    const newHeadLine = new HeadLine({
      links: linksArray
    });
    const savedLinks = await newHeadLine.save();
    res.status(201).json(savedLinks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createMultipleHeadLine = async (req, res) => {
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

    const updated = await HeadLine.findOneAndUpdate(
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
const getHeadLine = async (req, res) => {
  try {
    const headlines = await HeadLine.findOne({})
      .sort({ updatedAt: -1 })
      .limit(1);

    const links = headlines ? headlines.links : [];
    res.status(200).json(links);
  } catch (error) {
    console.error('Error fetching navigation links:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE - Replace all navigation links
const updateHeadLine = async (req, res) => {
  try {
    const { linkId, updatedLink } = req.body;

    if (!linkId || !updatedLink || !updatedLink.name || !updatedLink.path) {
      return res.status(400).json({ error: 'Missing required fields: linkId and updatedLink (with name and path)' });
    }

    const updated = await HeadLine.findOneAndUpdate(
      { 'links._id': linkId },
      {
        $set: {
          'links.$.name': updatedLink.name,
          'links.$.path': updatedLink.path
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.status(200).json(updated.links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE - Add a single new link
const addSingleHeadLine = async (req, res) => {
  try {
    const newLink = req.body;
    const updated = await HeadLine.findOneAndUpdate(
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
const deleteHeadLine = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await HeadLine.findOneAndUpdate(
      {},
      { $pull: { links: { $or: [{ _id: id }] } } },
      { new: true }
    );
    const links = updated ? updated.links : [];
    res.status(200).json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE - Clear all navigation links
const clearAllHeadLine = async (req, res) => {
  try {
    const updated = await HeadLine.findOneAndUpdate(
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
  createHeadLine,
  createMultipleHeadLine,
  getHeadLine,
  updateHeadLine,
  addSingleHeadLine,
  deleteHeadLine,
  clearAllHeadLine
};