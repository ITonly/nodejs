var express = require('express');
var path=require('path');
var bodyParser=require('body-parser');
var crypto=require('crypto');
var session=require('express-session');
var flash=require('connect-flash');


var mongoose=require('mongoose');
var moment=require('moment');

var models=require('./models/models');
var passport=require('passport');




mongoose.connect('mongodb://localhost:27017/notes');
mongoose.connection.on('error',console.error.bind(console,'连接数据库失败'));

var app=express();
var passport=require('passport')
    ,GithubStrategy=require('passport-github').Strategy;



app.set('views',path.join(__dirname,'views'));
//app.set('views',path.join(_))
app.set('view engine','ejs');


//定义静态文件目录
app.use(express.static(path.join(__dirname,'assets')));

//定义数据解析器
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));


//建立session 模型
app.use(session({
    secret:'1234',
    name:'mynote',
    cookie:{maxAge:1000*60*20},//设置session的保存时间为20分钟
    resave:true,
    saveUninitialized:true
    /*store: new MongoStore({
 mongooseConnection: mongoose.connection
        /*db: settings.db,
         host: settings.host,
         port: settings.port
       // url:'mongodb://localhost/notes'
    })*/
}));
app.use(flash());
app.use(passport.initialize());

passport.use(new GithubStrategy({
    clientID:"666eb6075de1c2eeb63f",
    clientSecret:"80eb468a9d5d547370350b34a4e58239cdd0ae9a",
    callbackURL:"http://localhost:3000/login/github/callback"
},function(accessToken,refreshToken,profile,done){
    done(null,profile);
}));

var User=models.User;
var Note=models.Note;

//响应首页get请求
app.get('/',checkLogin);
app.get('/',function(req,res){

        Note.find({author: req.session.user.username})
            .exec(function (err, allNotes) {
                if (err) {
                    console.log(err);
                    return res.redirect('/');
                }
                res.render('index', {
                    user: req.session.user,
                    title: '首页',
                    notes: allNotes,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            })


});


app.get('/register',checkNotLogin);
app.get('/register',function(req,res){
    console.log('注册！');
    res.render('register',{
        user:req.session.user,
        title:'注册',
        success:req.flash('success').toString(),
        error:req.flash('error').toString()
    });

});

/*app.get('/regdone',checkNotLogin);
app.get('/regdone',function(req,res){
    console.log('注册done');
    res.render('regdone',{
        user:req.session.user,
        title:'注册done',
        success:req.flash('success').toString(),
        error:req.flash('error').toString()
    });

});*/

app.post('/register',checkNotLogin);
app.post('/register', function (req,res){
        var username=req.body.username,
            password=req.body.password,
            passwordRepeat=req.body.passwordRepeat;

        if(username.trim().length==0){
            req.flash('error','用户名不能为空！');
            return res.redirect('/register');
        }
        if(!(username.match('^\\w+$'))){
            req.flash('error','用户名只能是字母、数字、下划线的组合！');
            return res.redirect('/register');
        }
        if(username.trim().length<3||username.trim().length>20){
            req.flash('error','用户名长度必须为3-20个字符！！');
            return res.redirect('/register');
    }


        if(password.trim().length==0||passwordRepeat.trim().length==0){
            req.flash("error",'密码不能为空！');
            return res.redirect('/register');
        }

        if(!(password.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[\da-zA-Z]/))){
            req.flash('error','密码必须同时包含数字、小写字母、大写字母！');
            return res.redirect('/register');
        }
        if(password.trim().length<6||passwordRepeat.trim().length<6){
            req.flash("error",'密码长度不能小于6！');
            return res.redirect('/register');
        }

        if(password != passwordRepeat){
            req.flash("error",'两次输入的密码不一致！');
            return res.redirect('/register');
        }

    User.findOne({username:username},function(err,user){
        if(err){
            console.log(err);
            return res.redirect('/register');
        }

        if(user){
            req.flash('error','用户名已经存在');
            return res.redirect('/register');
        }

        var md5=crypto.createHash('md5'),
            md5password=md5.update(password).digest('hex');

        var newUser=new User({
            username:username,
            password:md5password
        });

        newUser.save(function(err,doc){
            if(err){
                console.log(err);
                return res.redirect('/register');
            }
            req.flash('success','注册成功！');
            return res.redirect('/');
        });
    });

});

app.get('/login',checkNotLogin);
app.get('/login',function(req,res){
    console.log('登录');
    res.render('login',{
        user:req.session.user,
        success:req.flash('success').toString(),
        error:req.flash('error').toString(),
        title:'登录'
    });
});
app.get("/login/github", passport.authenticate("github", {session: false}));
app.get("/login/github/callback", passport.authenticate("github", {
    session: false,
    failureRedirect: '/login',
    success: '登陆成功！'
}), function (req, res) {
    req.session.user = {name: req.user.username, head: "https://gravatar.com/avatar/" + req.user._json.gravatar_id + "?s=48"};
    res.redirect('/');
});

app.post('/login',checkNotLogin);
app.post('/login',function(req,res){
    var username=req.body.username,
        password=req.body.password;
    User.findOne({username:username},function(err,user){
        if(err){
            console.log(err);
            return res.redirect('/login');
        }

        if(!user){
            req.flash("error",'用户名不存在')
            return res.redirect('/login');
        }

        var md5=crypto.createHash('md5'),
            md5password=md5.update(password).digest('hex');

        if(user.password !== md5password){
            req.flash("error",'密码错误！');
            return res.redirect('/login');
        }

        console.log('登录成功！');
        user.password=null;
        delete user.password;
        req.session.user=user;
        return res.redirect('/');
    });
})

app.get('/quit',checkLogin);
app.get('/quit',function(req,res){
    req.session.user=null;
    console.log('退出');
    return res.redirect('/login');
});

app.get('/post',checkLogin);
app.get('/post',function(req,res){
    console.log('发布');
    res.render('post',{
        user:req.session.user,
        title:'发布',
        success: req.flash('success').toString(),
        error: req.flash('error').toString()

    });
});

app.post('/post',checkLogin);
app.post('/post',function(req,res){
    var note=new Note({
        title:req.body.title,
        author:req.session.user.username,
        tag:req.body.tag,
        content:req.body.content,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()

    });

    note.save(function(err,doc){
        if(err){
            req.flash('error',err);
            return res.redirect('/post');
        }
        req.flash('success','文章发表成功！');
        return res.redirect('/');
    });
});

app.get('/detail/:_id',checkLogin);
app.get('/detail/:_id',function(req,res){
    console.log('查看笔记');
    Note.findOne({_id:req.params._id})
        .exec(function(err,art){
            if(err){
                console.log(err);
                return res.redirect('/');
            }
            if(art){

                res.render('detail',{
                    user:req.session.user,
                    title:'笔记详情',
                    art:art,
                    moment:moment,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            }
        })

});

app.use(function(req,res){
    res.render("404");
});


function checkLogin(req, res, next) {
    if (!req.session.user) {
        req.flash('error', '未登录!');
        return res.redirect('/login');
    }
    next();
}

function checkNotLogin(req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录!');
        return res.redirect('back');//返回之前的页面
    }
    next();
}
//监听3000端口
app.listen(3000,function(req,res){
    console.log('app is running at port 3000');
});


