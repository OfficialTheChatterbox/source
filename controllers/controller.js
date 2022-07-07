const Post = require('../models/post');
const User = require('../models/user');
const Comment = require('../models/comment');
const Ticket = require('../models/ticket');
const TicketReply = require('../models/ticket_replies');
const cloudinary = require('cloudinary');
const multer = require('multer');
const Passport = require('passport');
const postPageLimit = 20;
const homePageLimit = 25;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
const storage = multer.diskStorage({});

const upload = multer({storage});

exports.upload = upload.single('profile_picture');

exports.pushToCloudinary = (req, res, next) => {
    if (req.file) {
        cloudinary.uploader.upload(req.file.path)
        .then((result) => {
        req.body.profile_picture = result.public_id;
        next();
    })
        .catch(() => {
        res.redirect('/signup');
    })
    } else {
        next();
    }
}

// Express validator
const {check, validationResult} = require('express-validator/check');
const {sanitize} = require('express-validator/filter');

exports.indexPage = (req, res) => {
    res.redirect('/home');
}
exports.isLoggedIn = (req, res, next) => {
    if(req.isAuthenticated() || req.url.startsWith('/login') || req.url.startsWith("/signup") || req.url.startsWith("/about") || req.url.startsWith('/terms-of-service')) return next();
    res.redirect('/login')
}
exports.isAdmin = (req, res, next) => {
    if(req.user.isAdmin) return next();
    res.redirect('/help');
}
exports.preventLogInPageFromLoggedInUsers = (req, res, next) => {
    if (!req.isAuthenticated()) return next();
    res.redirect('/');
}
exports.signUpGet = (req, res) => {
    res.render('sign_up', {title: 'User sign up', errors: ''});
}
exports.signUpPost = [
    // validate data
    check('first_name').isLength({min: 1}).withMessage('First name must be specified').isAlphanumeric().withMessage("First name must be alphanumeric"),

    check('surname').isLength({min: 1}).withMessage('Surname must be specified').isAlphanumeric().withMessage("Surname must be alphanumeric"),

    check('username').isLength({min: 1}).withMessage('Username must be specified'),

    check('email').isEmail().withMessage('Invalid email address'),

    check('confirm_email').custom((value, {req}) => value === req.body.email).withMessage("Emails must match"),

    check('password').isLength({min: 8}).withMessage('Invalid password. Password must be at least 8 characters'),

    check('confirm_password').custom((value, {req}) => value === req.body.password).withMessage("Passwords must match"),

    sanitize('first_name').trim().escape(),
    sanitize('surname').trim().escape(),
    sanitize('username').trim(),
    sanitize('email').trim().escape(),
    sanitize('confirm_email').trim().escape(),
    sanitize('password').trim(),
    sanitize('confirm_password').trim(),
    sanitize('profile_picture').trim().escape(),
    sanitize('displayName').trim(),
    sanitize('description').trim(),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // handle errors
            res.render('sign_up', {title: 'User sign up', errorMessage: "Please fix the following errors:", errors: errors.array()});
            return;
        } else {
            req.body.username = req.body.username.replaceAll(" ", "_");
            req.body.username = req.body.username.replaceAll("#", "[hashtag]");
            req.body.username = req.body.username.replaceAll("%", "[percent sign]");
            if (req.body.profile_picture == "") {
                req.body.profile_picture = "defaultProfile_u6mqts";
            }
            const newUser = new User(req.body);
            User.register(newUser, req.body.password, function(err) {
                if(err) {
                    console.log('error while registering', err);
                    return next(err);
                }
                next()
            })
        }
    }
]
exports.addDefaultFollowers = async (req, res, next) => {
    try {
        let shadFollowers = await User.findOne({username: "shad"});
        let tcbFollowers = await User.findOne({username: "thechatterbox"});
        shadFollowers = parseInt(shadFollowers.followers);
        tcbFollowers = parseInt(tcbFollowers.followers);
        await User.findOneAndUpdate({username: "shad"}, {
            followers: shadFollowers + 1
        }, {new: true})
        await User.findOneAndUpdate({username: "thechatterbox"}, {
            followers: tcbFollowers + 1
        }, {new: true})
        next()
    } catch(error) {
        next(error);
    }
}
exports.logInGet = (req, res) => {
    res.render('login', {title: "Login"})
}
exports.logInPost = Passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
});
exports.logout = (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
}
exports.profile = async (req, res, next) => {
    try {
        const profileOwner = req.user;
        const unposts = Post.find({user: profileOwner.username}).sort({date: -1}).limit(postPageLimit);
        const page = 1;
        const unnextPost = Post.findOne({user: profileOwner.username}).sort({date: -1}).skip(postPageLimit);
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('user_page', {title: "Your profile", profileOwner, posts, page, nextPage});
    } catch (error) {
        next(error);
    }
}
exports.profilePage = async (req, res, next) => {
    try {
        const username = req.params.username;
        const profileOwner = await User.findOne({username: username});
        const unposts = Post.find({user: username}).sort({date: -1}).limit(postPageLimit);
        const page = 1;
        const unnextPost = Post.findOne({user: username}).sort({date: -1}).skip(postPageLimit);
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        if (profileOwner != null) {
            res.render('user_page', {title:`${profileOwner.displayName}'s profile`, profileOwner, posts, page, nextPage});
        } else {
            res.render('user_page', {title: "User not found", profileOwner, posts, page})
        }
    } catch(error) {
        next(error);
    }
}
exports.editProfileGet = (req, res) => {
    res.render('edit_profile', {title: "Edit profile"});
}
exports.editProfilePost = async (req, res, next) => {
    try {
        const username = req.user.username;
        const user = await User.findOneAndUpdate({username: username}, req.body, {new:true});
        if (req.body.profile_picture) {
            const unPosts = Post.find({user: username});
            const unComments = Comment.find({user: username});
            const [posts, comments] = await Promise.all([unPosts, unComments]);
            posts.forEach(async curr => {
                await Post.findOneAndUpdate({user: username}, {
                    userPFP: req.body.profile_picture
                }, {new: true}); 
            });
            comments.forEach(async curr => {
                await Comment.findOneAndUpdate({user: username}, {
                    userPFP: req.body.profile_picture
                }, {new: true});
            });
        }
        res.redirect('/profile');
    } catch(error) {
        next(error);
    }
}
exports.followUnfollow = async (req, res, next) => {
    try {
        const username = req.user.username;
        const followingUsername = req.params.username;
        let followers = await User.findOne({username: followingUsername});
        followers = parseInt(followers.followers);
        // what
        let e = await User.findOne({username: username})
        if (username == followingUsername) {
            res.redirect(`/user/${followingUsername}`)
        } else if (!e.following.includes(followingUsername)) {
            await User.findOneAndUpdate({username: username}, {
                $push: {
                    following: followingUsername
                }
            }, {new:true});
            await User.findOneAndUpdate({username: followingUsername}, {
                followers: followers + 1
            }, {new: true});
        } else {
            await User.findOneAndUpdate({username: username}, {
                $pull: {
                    following: followingUsername
                }
            }, {new:true});
            await User.findOneAndUpdate({username: followingUsername}, {
                followers: followers - 1
            }, {new:true});
        }
        res.redirect(`/user/${followingUsername}`);
    } catch(error) {
        next(error);
    }
}
exports.settings = (req, res) => {
    res.render('settings', {title: 'Settings'});
}
exports.editEmailGet = (req, res) => {
    res.render('edit_user', {title: 'Edit Email'});
}
exports.editPasswordGet = (req, res) => {
    res.render('edit_user', {title: 'Edit Password'});
}
exports.editNameGet = (req, res) => {
    res.render('edit_user', {title: 'Edit Name'});
}
exports.editEmailPost = async (req, res, next) => {
    try {
        await User.findOneAndUpdate({username: req.user.username}, {
            email: req.body.email
        }, {
            new: true
        });
        res.redirect('/');
    } catch(error) {
        next(error);
    }
}
exports.editPasswordPost = async (req, res, next) => {
    try {
        if (req.body.confirm_password === req.body.password) {
            req.user.changePassword(req.body.oldPassword, req.body.password, function(err) {
                if(err) {
                    console.log('error while registering', err);
                    return next(err);
                }
                res.redirect('/')
            })
        } else {
            res.render('edit_user', {title: "Edit Password: Passwords do not match"})
        }
    } catch(error) {
        next(error);
    }
} 
exports.editNamePost = async (req, res, next) => {
    try {
        await User.findOneAndUpdate({username: req.user.username}, {
            first_name: req.body.first_name,
            surname: req.body.surname
        }, {
            new: true
        });
        res.redirect('/');
    } catch(error) {
        next(error);
    }
}
exports.addPost = async (req, res, next) => {
    try {
        const post = new Post(req.body);
        await post.save();
        res.redirect(`/user/${req.body.user}/post/${post._id}`);
    } catch(error) {
        next(error);
    }
}
exports.deletePost = async (req, res, next) => {
    try {
        const unPost = await Post.findByIdAndRemove({_id: req.params.postID});
        const unComments = Comment.find({mainBox: req.params.postID});
        const [post, comments] = await Promise.all([unPost, unComments]);
        comments.forEach(async (item) => {
            await Comment.findByIdAndRemove({_id: item._id});
        })
        res.redirect('/profile');
    } catch(error) {
        next(error);
    }
}
exports.profilePageNumber = async (req, res, next) => {
    try {
        const username = req.params.username;
        const page = req.params.pageNumber;
        const skipAmount = (parseInt(page) - 1) * postPageLimit;
        const profileOwner = await User.findOne({username: username});
        const unposts = Post.find({user: username}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
        const unnextPost = Post.findOne({user: username}).sort({date: -1}).skip(skipAmount + postPageLimit);
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        if (profileOwner != null) {
            res.render('user_page', {title:`${profileOwner.displayName}'s profile`, profileOwner, posts, page, nextPage});
        } else {
            res.render('user_page', {title: "User not found", profileOwner, posts, page})
        }
    } catch(error) {
        next(error);
    }
}
exports.profileNumber = async (req, res, next) => {
    try {
        const username = req.user.username;
        const page = req.params.pageNumber;
        const skipAmount = (parseInt(page) - 1) * postPageLimit;
        const profileOwner = req.user;
        const unposts = Post.find({user: username}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
        const unnextPost = Post.findOne({user: username}).sort({date: -1}).skip(skipAmount + postPageLimit);
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('user_page', {title:`Your profile`, profileOwner, posts, page, nextPage});
    } catch(error) {
        next(error);
    }
}
exports.postPage = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const unPost = Post.findOne({_id: postId});
        const unComments = Comment.find({mainBox: postId}).limit(postPageLimit).sort({date: -1});
        const unNextPost = Comment.findOne({mainBox: postId}).sort({date: -1}).skip(postPageLimit);
        const [post, comments, nextPost] = await Promise.all([unPost, unComments, unNextPost]);
        const currentPage = 1;
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('post', {title: `Post by ${req.params.username}`, post, comments, currentPage, nextPage});
    } catch(error) {
        next(error);
    }
}
exports.about = (req, res) => {
    res.render('about', {title: 'About us'})
}
exports.postComment = async (req, res, next) => {
    try {
        const comment = new Comment(req.body);
        const saveComment = comment.save();
        let numOfComms = await Post.findOne({_id: req.params.postId});
        numOfComms = numOfComms.comments;
        const updateCommentNumber = Post.findOneAndUpdate({_id: req.params.postId}, {
            comments: numOfComms + 1
        }, {new: true})
        await Promise.all([saveComment, updateCommentNumber]);
        res.redirect(`/user/${req.params.username}/post/${req.params.postId}`);
    } catch(error) {
        next(error);
    }
}
exports.deleteComment = async (req, res, next) => {
    try {
            const post1 = await Post.findOne({_id: req.params.postId});
            const post = Post.findByIdAndUpdate(req.params.postId, {
                comments: parseInt(post1.comments) - 1
            }, {new:true})
            const comment = Comment.findByIdAndRemove(req.body.postId);
            Promise.all([post, comment]);
            res.redirect(`/user/${req.params.username}/post/${req.params.postId}`);
    } catch(error) {
        next(error);
    }
}
exports.postPageNum = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const currentPage = req.params.pageNum;
        const skipAmount = (parseInt(currentPage) - 1) * postPageLimit;
        const unPost = Post.findOne({_id: postId});
        const unComments = Comment.find({mainBox: postId}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
        const unNextPost = Comment.findOne({mainBox: postId}).sort({date: -1}).skip(skipAmount + postPageLimit);
        const [post, comments, nextPost] = await Promise.all([unPost, unComments, unNextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('post', {title: `Post by ${req.params.username}`, post, comments, currentPage, nextPage});
    } catch(error) {
        next(error);
    }
}
exports.searchPage = (req, res) => {
    res.render('search', {title: 'Search'});
}
exports.searchResults = async (req, res, next) => {
    try {
        let results;
        const searchType = req.query.searchType;
        const searchTerm = req.query.searchTerm;
        const sizeNumber = req.query.sizeNumber;
        if (searchType == "people") {
            results = await User.aggregate([
                {$match: {$text: {$search: `\"${searchTerm}\"`}}},
                {$limit: parseInt(sizeNumber)},
                {$sort: {followers: -1}}
            ])
        } else if (searchType == "posts") {
            results = await Post.aggregate([
                {$match: {$text: {$search: `\"${searchTerm}\"`}}},
                {$limit: parseInt(sizeNumber)},
                {$sort: {comments: -1}}
            ])
        }
        res.render('search', {title: "Search results", results, searchType, searchTerm, sizeNumber});
    } catch(error) {
        next(error);
    }
}
exports.homePage = async (req, res, next) => {
    try {
        const unPosts = Post.find({user: {$in: req.user.following}}).sort({date: -1}).limit(homePageLimit);
        const page = 1;
        const unNextPost = Post.findOne({user: {$in: req.user.following}}).sort({date: -1}).skip(homePageLimit);
        const [posts, nextPost] = await Promise.all([unPosts, unNextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('index', {title: 'The Chatterbox', posts, page, nextPage})
    } catch(error) {
        next(error);
    }
}
exports.homePageNum = async (req, res, next) => {
    try {
        const page = req.params.pageNum;
        const skipAmount = (parseInt(page) - 1) * homePageLimit;
        const unPosts = Post.find({user: {$in: req.user.following}}).sort({date: -1}).skip(skipAmount).limit(homePageLimit);
        const unNextPost = Post.findOne({user: {$in: req.user.following}}).sort({date: -1}).skip(skipAmount + homePageLimit);
        const [posts, nextPost] = await Promise.all([unPosts, unNextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('index', {title: 'The Chatterbox', posts, page, nextPage})
    } catch(error) {
        next(error);
    }
}
exports.explore = async (req, res, next) => {
    try {
        const randomPosts = await Post.aggregate([
            {$sample: {size: 50}}
        ]);
        res.render('explore', {title: "Explore", randomPosts});
    } catch(error) {
        next(error);
    }
}
exports.supportMain = (req, res) => {
    res.render('support', {title: 'The Chatterbox Support'});
}
exports.verificationGet = (req, res) => {
    res.render('verification', {title: 'Request a verification'});
}
exports.verificationPost = async (req, res, next) => {
    try {
        const ticket = new Ticket(req.body);
        await ticket.save();
        res.redirect('/help')
    } catch(error) {
        next(error);
    }
}
exports.ticketGet = (req, res) => {
    res.render('ticket', {title: 'Make a ticket'});
}
exports.ticketPost = async (req, res, next) => {
    try {
        const ticket = new Ticket(req.body);
        await ticket.save();
        res.redirect(`/help/tickets/${ticket._id}`);
    } catch(error) {
        next(error);
    }
}
exports.yourTickets = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({username: req.user.username, ticket_type: 'ticket'}).sort({date: -1});
        res.render('your_tickets', {title: 'Your tickets', tickets});
    } catch(error) {
        next(error);
    }
}
exports.adminTicket = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({open: true, ticket_type: 'ticket'});
        res.render('your_tickets', {title: 'Open tickets', tickets});
    } catch(error) {
        next(error);
    }
}
exports.ticketPage = async (req, res, next) => {
    try {
        const ticket = await Ticket.findOne({_id: req.params.ticketId});
        if ((req.user.username == ticket.username || req.user.isAdmin) && ticket.ticket_type == "ticket") {
            const comments = await TicketReply.find({mainTicket: ticket._id});
            res.render('ticket_page', {title: 'Ticket', ticket, comments});
        } else {
            res.redirect('/help');
        }
    } catch(error) {
        next(error);
    }
}
exports.ticketComment = async (req, res, next) => {
    try {
        const ticketReply = new TicketReply(req.body);
        await ticketReply.save();
        res.redirect(`/help/tickets/${req.params.ticketId}`)
    } catch(error) {
        next(error);
    }
}
exports.closeTicket = async (req, res, next) => {
    try {
        await Ticket.findByIdAndUpdate(req.params.ticketId, {
            open: false
        }, {new: true});
        res.redirect('/help')
    } catch(error) {
        next(error);
    }
}
exports.adminVerificationGet = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({open: true, ticket_type: 'verification'});
        res.render('verification_tickets', {title: 'Verification requests', tickets});
    } catch(error) {
        next(error);
    }
}
exports.adminVerificationPost = async (req, res, next) => {
    try {
        const body = req.body;
        if (body.accept) {
            await User.findOneAndUpdate({username: body.username}, {
                isVerified: true
            }, {new: true});
        } 
        await Ticket.findByIdAndRemove(body.ticketId);
        res.redirect('/admin/help/verification');
    } catch(error) {
        next(error);
    }
}
exports.termsOfService = (req, res) => {
    res.render('terms_of_service', {title: 'Terms of Service'});   
}
exports.deleteAccountPasswordGet = (req, res) => {
    res.render('delete_account', {title: 'Sign in to delete your account'})
}
exports.signInBeforeDeletion = Passport.authenticate('local', {
    failureRedirect: '/settings/delete'
});
exports.deleteUser = async (req, res, next) => {
    try {
        // Remove one follower from each of the user's following
        req.user.following.forEach(async (c) => {
            let userFollowers = await User.findOne({username: c})
            userFollowers = userFollowers.followers;
            await User.findOneAndUpdate({username: c}, {
                followers: parseInt(userFollowers) - 1
            }, {new: true})
        });
        // remove user from people's followings
        const followers = await User.find({following: req.user.username});
        followers.forEach(async (c) => {
            await User.findOneAndUpdate({username: c.username}, {
                $pull: {following: req.user.username}
            }, {new: true})
        })
        // delete the users posts
        const posts = await Post.find({user: req.user.username});
        posts.forEach(async (c) => {
            await Post.findByIdAndRemove(c._id);
        })
        // delete the users comments
        const comments = await Comment.find({user: req.user.username});
        comments.forEach(async (c) => {
            await Comment.findByIdAndRemove(c._id);
            let post1 = await Post.findOne({_id: c.mainBox});
            post1 = post1.comments
            await Post.findByIdAndUpdate(c.mainBox, {
                comments: parseInt(post1) - 1
            })
        })

        // DELETE THE USER
        await User.findByIdAndRemove(req.user._id);
        res.redirect('/');
    } catch(error) {
        next(error);
    }
}
exports.adminDeleteGet = (req, res) => {
    res.render('admin_search', {title: 'Search user to delete'})
}
exports.adminDeletePost = async (req, res, next) => {
    try {
        const deletingUser = await User.findOne({username: req.body.user}).collation({
            locale: 'en',
            strength: 2
        });
        if (deletingUser != null) {
            res.render('admin_search_result', {title: 'Delete user?', deletingUser})
        } else {
            res.redirect('/admin/delete_account');
        }
    } catch(error) {
        next(error);
    }
}
exports.confirmationDelete = async (req, res, next) => {
    try {
        const deletingUser = await User.findOne({username: req.params.username});
        res.render('confirm_deletion', {title: 'Are you sure you want to delete this user?', deletingUser});
    } catch(error) {
        next(error);
    }
}
exports.deleteAdmin = async (req, res, next) => {
    try {
        const user = await User.findOne({username: req.params.username});
        // Remove one follower from each of the user's following
        user.following.forEach(async (c) => {
            let userFollowers = await User.findOne({username: c})
            userFollowers = userFollowers.followers;
            await User.findOneAndUpdate({username: c}, {
                followers: parseInt(userFollowers) - 1
            }, {new: true})
        });
        // remove user from people's followings
        const followers = await User.find({following: user.username});
        followers.forEach(async (c) => {
            await User.findOneAndUpdate({username: c.username}, {
                $pull: {following: user.username}
            }, {new: true})
        })
        // delete the users posts
        const posts = await Post.find({user: user.username});
        posts.forEach(async (c) => {
            await Post.findByIdAndRemove(c._id);
        })
        // delete the users comments
        const comments = await Comment.find({user: user.username});
        comments.forEach(async (c) => {
            await Comment.findByIdAndRemove(c._id);
            let post1 = await Post.findOne({_id: c.mainBox});
            post1 = post1.comments
            await Post.findByIdAndUpdate(c.mainBox, {
                comments: parseInt(post1) - 1
            })
        })

        // DELETE THE USER
        await User.findByIdAndRemove(user._id);
        res.redirect('/');
    } catch(error) {
        next(error);
    }
}
