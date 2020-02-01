const express = require('express');
const userRouter = require('./routers/userRouter');
const adminRouter = require('./routers/adminRouter');
const blogRouter = require('./routers/blogRouter');
const commentRouter = require('./routers/commentRouter');
require('./db/mongoose');

const app = express();
const port = process.env.PORT

app.use(express.json())
app.use(userRouter);
app.use(adminRouter);
app.use(blogRouter);
app.use(commentRouter);

app.get('*', (req, res) => {
    res.status(404).send({ error: 'route or path is not supported' })
})

app.listen(port, () => {
    console.log(`Server is up on port ${port}`);
})

