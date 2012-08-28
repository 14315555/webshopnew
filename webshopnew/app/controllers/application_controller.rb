class ApplicationController < ActionController::Base
  protect_from_forgery

  def logged_in?
    session[:user_id]
  end

  def current_user
    if logged_in?
      @current_user = User.find session[:user_id]
    end
  end

  helper_method :logged_in?
  helper_method :current_user

end
