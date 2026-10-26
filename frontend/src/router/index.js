import { createRouter, createWebHistory } from 'vue-router'
import TeacherLive from '../views/TeacherLive.vue'
import StudentView from '../views/StudentView.vue'

const routes = [
    { path: '/', component: TeacherLive, name: 'teacher' },
    { path: '/student/:roomId', component: StudentView, name: 'student' }
]

export default createRouter({
    history: createWebHistory(),
    routes
})
