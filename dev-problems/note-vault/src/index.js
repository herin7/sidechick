const mongoose = require('mongoose');
const app = require('./app');

mongoose.connect('mongodb://localhost:27017/note-vault-dev', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  app.listen(3000, () => console.log('Server running on port 3000'));
})
.catch(err => console.error('MongoDB connection error:', err));
