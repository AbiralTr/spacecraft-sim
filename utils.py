import math

class MathHelpers:

    def compute_dot_product(v1, v2):
        u1 = v1[0] * v2[0]
        u2 = v1[1] * v2[1]
        u3 = v1[2] * v2[2]

        return u1+u2+u3

    def subtract_two_vectors(v1, v2):
        u1 = v1[0] - v2[0]
        u2 = v1[1] - v2[1]
        u3 = v1[2] - v2[2]

        return (u1, u2, u3)

    def compute_magnitude(v):

        return math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)

    def keplers_equation(M, e):
        """
        M: Mean Anomaly (radians), e: eccentricity of a spacecraft
        this function solves for E, eccentric anomaly
        """
        E = M
        for i in range(5):
            E = E - (E - e * math.sin(E) - M) / (1 - e * math.cos(E))

        return E
        
        
