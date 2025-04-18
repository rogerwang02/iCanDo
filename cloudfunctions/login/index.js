'use strict';
const db = uniCloud.database()

exports.main = async (event, context) => {
    const { code } = event
    
    try {
        // 获取openid
        const res = await uniCloud.httpclient.request(
            'https://api.weixin.qq.com/sns/jscode2session',
            {
                method: 'GET',
                data: {
                    appid: '你的小程序appid',
                    secret: '你的小程序secret',
                    js_code: code,
                    grant_type: 'authorization_code'
                },
                dataType: 'json'
            }
        )
        
        if (res.status !== 200) {
            throw new Error('获取openid失败')
        }
        
        const { openid, session_key } = res.data
        
        if (!openid) {
            throw new Error('获取openid失败')
        }
        
        // 查询用户信息
        const user = await db.collection('users').where({
            openid: openid
        }).get()
        
        let userInfo = null
        if (user.data.length > 0) {
            userInfo = user.data[0]
        }
        
        return {
            success: true,
            data: {
                openid,
                session_key,
                userInfo
            }
        }
    } catch (error) {
        console.error('登录失败:', error)
        return {
            success: false,
            message: error.message || '登录失败'
        }
    }
} 