const fs = require('fs');
const path = require('path');

module.exports = {
  async uploadImg(req, res) {
    const serverUrl = req.get('host');
    const { files } = req;
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const paths = files.map((file) => ({
      path: `${protocol}://${serverUrl}/images/${file.filename}`,
    }));
    return res.status(201).json(paths);
  },

  async deleteImg(req, res) {
    const { filename } = req.params;
    fs.unlinkSync(path.resolve(__dirname, '..', '..', '/uploads', filename));
    return res.status(200).send();
  },
};
