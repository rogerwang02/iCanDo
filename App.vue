<script>
export default {
    onLaunch: function() {
        console.log('App Launch')
    },
    onShow: function() {
        console.log('App Show')
    },
    onHide: function() {
        console.log('App Hide')
    },
    onExit: function() {
        console.log('App Exit')
    }
}
</script>

<style>
/*每个页面公共css */
.uni-row {
    flex-direction: row;
}

.uni-column {
    flex-direction: column;
}
</style> 