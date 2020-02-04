'use strict'

// ------------------------------------------------ IMPORTS

const express = require('express')
const http = require('http')
const fs = require('fs')

// ------------------------------------------------ VARS

const app = express()
const port = process.argv[2] || 8080
const map_path = process.argv[3] || './redirect.json'

// ------------------------------------------------ CONFIG

app.enable('trust proxy')

// ------------------------------------------------ REBASE

function fill_redirector_blank(redirector) {
    let base_redirector = {
        host:'127.0.0.1',
        port:80,
        pre_path:'',
        allowed_methods:['GET','POST','PUT','DELETE']
    }
    let final_redirector = base_redirector
    for(let prop in redirector) {
        final_redirector[prop] = redirector[prop]
    }
    return final_redirector
}

// ------------------------------------------------ FIND REDIRECTOR

function extend_map(map) {
    let variables = {}

    function update_prop(map) {
        map = JSON.parse(JSON.stringify(map))
        if(typeof map === 'string') {
            if(map.includes('@')) {
                return variables[map.replace('@','')]
            }
        } else {
            for(let prop in map) {
                map[prop] = update_prop(map[prop])
                variables[prop.replace('#','')] = map[prop]
            }
        }
        return map
    }

    map = update_prop(map)
    let final_map = {}
    for(let prop in map) {
        if(!prop.includes('#')) {
            final_map[prop] = map[prop]
        }
    }

    return final_map    
}

function find_redirector(host) {

    let sp_host = host.split('.').reverse()

    let is_ip = sp_host.length == 4 
    if(is_ip) {
        sp_host = [host]
    }

    let domain = sp_host[0]=='localhost'?'':sp_host[0]
    let name = domain==''?'localhost':sp_host[1]

    let abs_name = name+(domain==''?'':('.'+domain))
    let sub_d = (domain==''?sp_host[1]:sp_host[2]) || ''

    if(!fs.existsSync(map_path)) {
        console.log('Redirect map "'+map_path+'" missing !')
        return null
    }

    const redirect_map = extend_map(JSON.parse(fs.readFileSync(map_path,'utf8')))

    if(abs_name in redirect_map) {
        while(typeof redirect_map[abs_name] === 'string') {
            abs_name = redirect_map[abs_name]
        }
        let sub_d_map = redirect_map[abs_name]
        if(sub_d in sub_d_map) {
            let redirector = sub_d_map[sub_d]
            return fill_redirector_blank(redirector)
        }
    }

    return null
}

// ------------------------------------------------ PROXY

app.all('/*',function(req, res) {

    // --- finding redirectori

    let host = req.hostname
    
    console.log('in host:',host,req.socket.localPort,req.path)

    let redirector = find_redirector(host)

    // --- imposible cases

    if(redirector == null || redirector.allowed_methods.indexOf(req.method)==-1) {
        console.log('   no redirect || not allowed')
        res.status(404)
        res.sendFile(__dirname+'/404.html')
        return
    }

    // --- prepare options

    let headers = req.headers
    headers.host = redirector.host

    const options = {
        host: redirector.host,
        port: redirector.port,
        path: redirector.pre_path+req.path,
        method: req.method,
        headers: headers,
    }

    console.log('   redirect to:',options.host,options.port,options.path)

    // --- http request

    const proxy_req = http.request(options, proxy_res => {

        // --- recieve and repipe response

        const contentType = proxy_res.headers['content-type']
        if(contentType !== undefined) {
            res.setHeader('Content-Type', contentType)
        }
        proxy_res.pipe(res)

    })
    // --- on request error
    .on('error', e => {
        try {
            console.log('Error while redirecting - ',e.name,e.message)
            res.writeHead(500)
            res.write(e.message)
        } catch (e) {
            console.log('fatal error !',e.name,e.message)
        }
        res.end()
    })

    // --- end  request

    proxy_req.end()
})

// ------------------------------------------------ EXECUTE

app.listen(port, function () {
    console.log('start muxxer a listening on',port)
})