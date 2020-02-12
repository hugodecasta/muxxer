# muxxer
redirect your hosts

### fundamentals

The muxxer system is used for port and path http redirection. When someone connecto to your muxxer port/host, the config file tells which port and sub server corresponds to the incomming request.

Muxxer acts as an internal proxy

### config

In order to setup the redirection system a config json formated file is used.

Here is a simple example of the redirection map config file

``` json
  "mywebsite.com": {
    "": {
      "host":"localhost",
      "port":8080,
      "pre-path":"",
      "allowed_methods":["GET"]
    },
    "webtools": {
      "host":"localhost",
      "port":8080,
      "pre-path":"/webtools",
      "allowed_methods":["GET"]
    },
    "api": {
      "host":"localhost",
      "port":9001,
      "pre-path":"",
      "allowed_methods":["GET","POST","PUT","DELETE"]
    }
  }
```

In this example, we create 3 sub routes for the mybesite.com host . These sub routes corresponds to sub-domain registered with the main domain.

In our server hierarchy, we have a static file server listening on port 8080 and serving this directory tree:

```
  ./
      index.html
      style.css
      webtools/
        my_tool/
          index.html
          main.js
```

One can ether access the `"my_tool"` web tool by calling `http://mywebsite.com/my_tool/` or using the `"webtools"` subdomain `http://webtools.mywebsite.com/my_tool`

To access the api server, simply use the api subdomain as described in the redirect map `http://api.mywebsite.com/say_jokes`. The muxxer will redirect the incoming request to the api server listening on 9001 and accepting all http methods.

If one tries to connect to the server using an unconfigured host, the muxxer will serv a static 404.html page.
This page is given in the repository but can be altered (just be aware not to import other static files in this html, the muxxer won't serve them)

### executing

To execute the muxxer, just launch a nodejs command with the listening port and the config json formated file path

`node <muxxer/dir/path> <port> <confg/path/file.json>`

ex. `sudo node ./muxxer 80 ./config/redirect_map.json` (most systems require a super user to initiate a "port 80 listener")
