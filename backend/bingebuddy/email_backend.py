"""
Custom email backend for Python 3.12 compatibility.
Django < 4.2 uses deprecated keyfile/certfile parameters that were removed in Python 3.12.
This backend fixes that issue.
"""

import ssl
import smtplib
from django.core.mail.backends.smtp import EmailBackend


class Python312EmailBackend(EmailBackend):
    """
    A custom SMTP email backend that works with Python 3.12+
    by not passing the removed keyfile/certfile parameters.
    """
    
    def open(self):
        """
        Open a connection to the mail server.
        """
        if self.connection:
            return False
        
        connection_params = {'local_hostname': self.host}
        if self.timeout is not None:
            connection_params['timeout'] = self.timeout
        
        try:
            self.connection = self.connection_class(
                self.host, self.port, **connection_params
            )
            
            # TLS connection without keyfile/certfile (Python 3.12 compatible)
            if self.use_tls:
                context = ssl.create_default_context()
                self.connection.ehlo()
                self.connection.starttls(context=context)
                self.connection.ehlo()
            
            if self.username and self.password:
                self.connection.login(self.username, self.password)
            
            return True
        except OSError:
            if not self.fail_silently:
                raise
