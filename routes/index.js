var express = require('express');
var router = express.Router();
const controller = require("../controllers/controller");

router.get('*', controller.isLoggedIn);
router.get('/admin/*', controller.isAdmin);

// Normal pages
router.get('/', controller.indexPage);
router.get('/profile', controller.profile);
router.get('/user/:username', controller.profilePage);
router.post('/post', controller.addPost);
router.post('/user/:username/post/:postID/delete', controller.deletePost);
router.get('/user/:username/post/:postId', controller.postPage);
router.post('/user/:username/post/:postId/comment', controller.postComment);
router.post('/user/:username/post/:postId/comment/delete', controller.deleteComment);
router.get('/user/:username/post/:postId/:pageNum', controller.postPageNum);
router.get('/about', controller.about);
router.get('/search', controller.searchPage);
router.get('/search/results', controller.searchResults);
router.get('/home', controller.homePage);
router.get('/home/:pageNum', controller.homePageNum);
router.get('/explore', controller.explore);

//user routes
router.get('/signup', controller.preventLogInPageFromLoggedInUsers, controller.signUpGet);
router.post('/signup', controller.upload, controller.pushToCloudinary, controller.signUpPost, controller.addDefaultFollowers, controller.logInPost);
router.get('/login', controller.preventLogInPageFromLoggedInUsers, controller.logInGet);
router.post('/login', controller.logInPost);
router.get('/logout', controller.logout);
router.get('/profile/edit', controller.editProfileGet);
router.post('/profile/edit', controller.upload, controller.pushToCloudinary, controller.editProfilePost);
router.post('/user/:username', controller.followUnfollow)
router.get('/settings', controller.settings);
router.get('/settings/email', controller.editEmailGet);
router.get('/settings/password', controller.editPasswordGet);
router.get('/settings/name', controller.editNameGet);
router.post('/settings/email', controller.editEmailPost);
router.post('/settings/password', controller.editPasswordPost);
router.post('/settings/name', controller.editNamePost);
router.get('/terms-of-service', controller.termsOfService);
router.get('/settings/delete', controller.deleteAccountPasswordGet);
router.post('/settings/delete', controller.signInBeforeDeletion, controller.deleteUser);

// page number
router.get('/user/:username/:pageNumber', controller.profilePageNumber);
router.get('/profile/:pageNumber', controller.profileNumber);

// TICKETS
router.get('/help/tickets/:ticketId', controller.ticketPage);
router.post('/help/tickets/:ticketId/comment', controller.ticketComment);
router.post('/help/tickets/:ticketId', controller.closeTicket);

// user help routes
router.get('/help', controller.supportMain);
router.get('/help/verification', controller.verificationGet);
router.post('/help/verification', controller.verificationPost);
router.get('/help/ticket', controller.ticketGet);
router.post('/help/ticket', controller.ticketPost);
router.get('/help/your-tickets', controller.yourTickets);

// admin
router.get('/admin/help/ticket', controller.adminTicket);
router.get('/admin/help/verification', controller.adminVerificationGet);
router.post('/admin/help/verification', controller.adminVerificationPost);
router.get('/admin/delete_account', controller.adminDeleteGet);
router.post('/admin/delete_account', controller.adminDeletePost);
router.get('/admin/delete/:username', controller.confirmationDelete);
router.post('/admin/delete/:username', controller.deleteAdmin);

module.exports = router;