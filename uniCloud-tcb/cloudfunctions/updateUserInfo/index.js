'use strict';
const db = uniCloud.database()

exports.main = async (event, context) => {
    const { openid, userInfo } = event
    
    try {
        // 更新用户信息
        const result = await db.collection('users').where({
            openid: openid
        }).update({
            ...userInfo,
            updateTime: Date.now()
        })
        
        if (result.updated === 0) {
            // 如果用户不存在，则创建新用户
            await db.collection('users').add({
                openid,
                ...userInfo,
                createTime: Date.now(),
                updateTime: Date.now()
            })
        }
        
        return {
            success: true,
            message: '更新成功'
        }
    } catch (error) {
        console.error('更新用户信息失败:', error)
        return {
            success: false,
            message: '更新失败'
        }
    }
} 