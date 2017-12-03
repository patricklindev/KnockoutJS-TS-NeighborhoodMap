import webapp2


class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.write(open('index.html').read())

app = webapp2.WSGIApplication([('/', MainPage)],
                              debug=True)
