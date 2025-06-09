const express = require("express");
const userRouter = express.Router();

const {
    userAuth
} = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");

const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills";

// Get all the pending connection request for the loggedIn user
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;

        const connectionRequests = await ConnectionRequest.find({
            toUserId: loggedInUser._id,
            status: "interested",
        }).populate("fromUserId", USER_SAFE_DATA);
        // }).populate("fromUserId", ["firstName", "lastName"]);

        res.json({
            message: "Data fetched successfully",
            data: connectionRequests,
        });
    } catch (err) {
        req.statusCode(400).send("ERROR: " + err.message);
    }
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;

        const connectionRequests = await ConnectionRequest.find({
            $or: [{
                toUserId: loggedInUser._id,
                status: "accepted"
            },
            {
                fromUserId: loggedInUser._id,
                status: "accepted"
            },
            ],
        })
            .populate("fromUserId", USER_SAFE_DATA)
            .populate("toUserId", USER_SAFE_DATA);

        console.log(connectionRequests);

        const data = connectionRequests.map((row) => {
            if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
                return row.toUserId;
            }
            return row.fromUserId;
        });

        res.json({
            data
        });
    } catch (err) {
        res.status(400).send({
            message: err.message
        });
    }
});

userRouter.get("/explore", userAuth, async (req, res) => {
  try {
    const presentUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { fromUserId: presentUser._id },
        { toUserId: presentUser._id }
      ],
    }).select("fromUserId toUserId");

    const hideUsersFromFeed = new Set();
    connectionRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });

    hideUsersFromFeed.add(presentUser._id.toString());

    const exploreData = await User.find({
      _id: { $nin: Array.from(hideUsersFromFeed) }
    }).select(USER_SAFE_DATA);

    const hasConnection = await ConnectionRequest.find({
        status: 'accepted'
    }).select("fromUserId toUserId")

    const connectedId = new Set();

    hasConnection.forEach((user) => {
        connectedId.add(user.fromUserId.toString());
        connectedId.add(user.toUserId.toString())
    })

    const withConnectionStatus = exploreData.map(user => {
        const currUserId = user._id.toString();
        const status = connectedId.has(currUserId) ? "connected" : "notConnected"
        return {
            ...user.toObject(),
            status
        };

    });

    res.json({ data: withConnectionStatus });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


userRouter.get("/feed", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;

        const page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        limit = limit > 50 ? 50 : limit;
        const skip = (page - 1) * limit;

        const connectionRequests = await ConnectionRequest.find({
            $or: [{
                fromUserId: loggedInUser._id
            }, {
                toUserId: loggedInUser._id
            }],
        }).select("fromUserId  toUserId");

        const connected = await ConnectionRequest.find({
            status: 'accepted'
        })


        const hideUsersFromFeed = new Set();
        connectionRequests.forEach((req) => {
            hideUsersFromFeed.add(req.fromUserId.toString());
            hideUsersFromFeed.add(req.toUserId.toString());
        });

        connected.forEach((req) => {
            hideUsersFromFeed.add(req.fromUserId.toString());
            hideUsersFromFeed.add(req.toUserId.toString());
        })

        const users = await User.find({
            $and: [{
                _id: {
                    $nin: Array.from(hideUsersFromFeed)
                }
            },
            {
                _id: {
                    $ne: loggedInUser._id
                }
            },
            ],
        })
            .select(USER_SAFE_DATA)
        // .skip(skip)
        // .limit(limit);

        res.json({
            data: users
        });
    } catch (err) {
        res.status(400).json({
            message: err.message
        });
    }
});
module.exports = userRouter;