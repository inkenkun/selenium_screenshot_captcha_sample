var webdriver = require('selenium-webdriver');
var fs = require('fs');
var gm = require('gm').subClass({imageMagick: true});
var async = require('async');
var del = require('del');

var browser = process.argv[2];
var server = 'http://localhost:4444/wd/hub';
var destdir = './out/';
var tmpdir = './tmp/';

del.sync([ tmpdir + '*']);

if(browser == 'chrome'){
	var driver = new webdriver.Builder().
	    usingServer(server).
	    withCapabilities(webdriver.Capabilities.chrome()).
	    build();
}else if(browser == 'firefox'){
	var driver = new webdriver.Builder().
	    usingServer(server).
	    withCapabilities(webdriver.Capabilities.firefox()).
	    build();
}else if(browser == 'safari'){
	var driver = new webdriver.Builder().
	    usingServer(server).
	    withCapabilities(webdriver.Capabilities.safari()).
	    build();
}else if(browser == 'iphone'){

	var capabilities = {
	    browserName: 'chrome',
	    chromeOptions: {
	        mobileEmulation: {
	            deviceName: 'Apple iPhone 5'
	        }
	    }
	};

	var driver = new webdriver.Builder().
	    usingServer(server).
	    withCapabilities(capabilities).
	    build();
}else if(browser == 'android'){

	var capabilities = {
	    browserName: 'chrome',
	    chromeOptions: {
	        mobileEmulation: {
	            deviceName: 'Google Nexus 5'
	        }
	    }
	};

	var driver = new webdriver.Builder().
	    usingServer(server).
	    withCapabilities(capabilities).
	    build();
}else{
	process.exit(0);
}

var urls =
[
    'http://x1.inkenkun.com',
    'http://sake.inkenkun.com',
    'http://dangan-trip.com'
];

function sleep(milliSeconds)
{
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + milliSeconds);
}

webdriver.WebDriver.prototype.saveScreenshot_firefox = function(filename) 
{
    filename = browser + '_' + filename.replace(/\//g , '_');
    return driver.takeScreenshot().
        then(function(data)
        {
            fs.writeFile
            (
                destdir + filename + ".png",
                data.replace(/^data:image\/png;base64,/,''), 
                'base64',
                function(error)
                {
                    if(error) throw error;
                }
            );
        });
};

webdriver.WebDriver.prototype.saveScreenshot = function(filename, total_height, view_height) 
{
	filename = browser + '_' + filename.replace(/\//g , '_');

	var scroll_height = 0;
	var row_count = 0;

	async.whilst(

		function () { return scroll_height < total_height; },

		function (callback){
			console.log(scroll_height);

			driver.executeScript('window.scrollTo(0, ' + scroll_height + ')').
			then(function(){

				sleep(500);
	            driver.takeScreenshot().
			    then(function(data)
			    {
			    	console.log("create png");
			        fs.writeFile
			        (
			            tmpdir + filename + row_count + ".png",
			            data.replace(/^data:image\/png;base64,/,''), 
			            'base64',
			            function(error)
			            {
			                if(error) throw error;
			            }
			        );
			    }).
			    then(function(){
			    	console.log("count+");
			    	row_count++;
			    	scroll_height = view_height * row_count;
			    	callback();
			    });
			});
		},
		function () {

			console.log("row",row_count);
			if(row_count > 1){

				var count = 1;
				var files = [];

				async.whilst(

					function () { return count < row_count; },

					function (callback2){

						files.push(tmpdir + filename + count + ".png");
						count++;
						callback2();
					},

					function () {

						console.log("append",files);
						gm(tmpdir + filename + "0.png")
						.append(files)
						.write(destdir + filename + ".png", function (err) {
					        if (err) console.log(err);
					    });
					}
				)
			}else{
				fs.renameSync(tmpdir + filename + "0.png", destdir + filename + ".png");
			}
	        console.log("callback");
	    }
	);
};



urls.forEach
(
    function(url)
    {
        var total_height = '';
        var view_height = '';
        driver.get(url).
        	then(function()
            {
            	if(browser == 'iphone'){
            		console.log("resize");
					return driver.manage().window().setSize(320, 640); 
            	}else if(browser == 'android'){
            		console.log("resize");
					return driver.manage().window().setSize(360, 640);
            	}else{
            		return;
            	}
            }).
            then(function()
            {
            	sleep(500);
                driver.executeScript('return document.body.scrollHeight').then(function(data){
                	total_height = data;
                })
            }).
            then(function(total_hight)
            {
                driver.executeScript('return window.innerHeight').then(function(data){
                	view_height = data;
                })
            }).
            then(function()
            {
                var filename = url.split('//');
                if(browser=='firefox'){
                	return driver.saveScreenshot_firefox(filename[1]);
                }else{
                	console.log('high',total_height , view_height)
                	return driver.saveScreenshot(filename[1],total_height , view_height);
                }
                
            });
    }
);

driver.quit();